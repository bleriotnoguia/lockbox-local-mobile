import { useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../store/authStore';
import { useLockboxStore } from '../store/lockboxStore';
import * as db from '../db';
import {
  encrypt,
  decrypt,
  hashPassword,
  hmacSign,
  hmacVerify,
  lockboxSignData,
} from '../crypto';
import type { ExportData, ExportLockbox } from '../types';

export function useExportImport() {
  const getMasterHash = useAuthStore((s) => s.getMasterHash);
  const fetchLockboxes = useLockboxStore((s) => s.fetchLockboxes);

  const exportLockboxes = useCallback(async () => {
    const masterHash = getMasterHash();
    const lockboxes = await db.getAllLockboxes();

    const exportData: ExportData = {
      version: '2.0.0',
      exported_at: Date.now(),
      lockboxes: lockboxes.map((lb) => {
        const signData = lockboxSignData(
          lb.name,
          lb.content,
          lb.unlock_delay_seconds,
          lb.relock_delay_seconds,
          lb.penalty_enabled,
          lb.penalty_seconds
        );
        const signature = masterHash ? hmacSign(signData, masterHash) : null;

        const exported: ExportLockbox = {
          name: lb.name,
          content: lb.content,
          category: lb.category,
          unlock_delay_seconds: lb.unlock_delay_seconds,
          relock_delay_seconds: lb.relock_delay_seconds,
          reflection_enabled: lb.reflection_enabled,
          reflection_message: lb.reflection_message,
          reflection_checklist: lb.reflection_checklist,
          penalty_enabled: lb.penalty_enabled,
          penalty_seconds: lb.penalty_seconds,
          tags: lb.tags,
          signature,
        };
        return exported;
      }),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `lockbox-export-${Date.now()}.json`;
    const file = new File(Paths.cache, filename);
    file.write(jsonString);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Lockboxes',
    });

    return true;
  }, [getMasterHash]);

  const importLockboxes = useCallback(
    async (sourcePassword?: string): Promise<string[]> => {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return [];
      }

      const fileUri = result.assets[0].uri;
      const content = await new File(fileUri).text();

      const exportData: ExportData = JSON.parse(content);

      const currentHash = getMasterHash();
      const sourceHash = sourcePassword
        ? hashPassword(sourcePassword)
        : undefined;

      const existingLockboxes = await db.getAllLockboxes();
      const existingNames = new Set(existingLockboxes.map((lb) => lb.name));

      const imported: string[] = [];

      for (const lb of exportData.lockboxes) {
        if (existingNames.has(lb.name)) continue;

        const verifyKey = sourceHash ?? currentHash;
        if (lb.signature && verifyKey) {
          const signData = lockboxSignData(
            lb.name,
            lb.content,
            lb.unlock_delay_seconds,
            lb.relock_delay_seconds,
            lb.penalty_enabled ?? false,
            lb.penalty_seconds ?? 0
          );
          if (!hmacVerify(signData, verifyKey, lb.signature)) {
            throw new Error(`integrity_failed:${lb.name}`);
          }
        }

        let finalContent = lb.content;
        if (sourceHash && currentHash && sourceHash !== currentHash) {
          try {
            const decrypted = decrypt(lb.content, sourceHash);
            finalContent = encrypt(decrypted, currentHash);
          } catch {
            throw new Error(`decrypt_failed:${lb.name}`);
          }
        }

        await db.createLockbox({
          name: lb.name,
          content: finalContent,
          category: lb.category,
          unlock_delay_seconds: lb.unlock_delay_seconds,
          relock_delay_seconds: lb.relock_delay_seconds,
          reflection_enabled: lb.reflection_enabled ?? false,
          reflection_message: lb.reflection_message ?? null,
          reflection_checklist: lb.reflection_checklist ?? null,
          penalty_enabled: lb.penalty_enabled ?? false,
          penalty_seconds: lb.penalty_seconds ?? 0,
          panic_code_hash: null,
          scheduled_unlock_at: null,
          tags: lb.tags ?? null,
        });

        imported.push(lb.name);
      }

      await fetchLockboxes();
      return imported;
    },
    [getMasterHash, fetchLockboxes]
  );

  return { exportLockboxes, importLockboxes };
}
