import type { AIProvider } from './AIProvider';
import type {
  ProviderHealth,
  ProviderMessage,
  ProviderResult,
} from '../types';
import { exec } from 'child_process';
import { logger } from '../config/logger';

/**
 * MiMo AI provider — calls the locally installed `mimo` CLI.
 */
export class MiMoProvider implements AIProvider {
  readonly name = 'mimo';

  async sendMessage(messages: ProviderMessage[]): Promise<ProviderResult> {
    if (messages.length === 0) {
      throw new Error('MiMoProvider requires at least one message');
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    const prompt = lastUserMessage?.content ?? '';

    if (!prompt) {
      throw new Error('No user message found in conversation');
    }

    logger.debug(
      { messageCount: messages.length },
      'MiMoProvider executing CLI',
    );

    const content = await this.runCli(prompt);

    if (!content) {
      throw new Error('MiMo CLI returned empty response');
    }

    logger.info({ messageCount: messages.length }, 'MiMoProvider response received');

    return {
      content,
      metadata: {
        provider: this.name,
        messageCount: messages.length,
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return new Promise((resolve) => {
      exec('mimo --version', { timeout: 5000 }, (err, stdout) => {
        resolve({
          healthy: !err,
          provider: this.name,
          details: {
            version: err ? undefined : stdout.trim(),
          },
        });
      });
    });
  }

  private runCli(prompt: string): Promise<string> {
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const cmd = `echo "${escaped}" | mimo run --dangerously-skip-permissions --format json`;

    return new Promise((resolve, reject) => {
      exec(
        cmd,
        { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            logger.error({ err, stderr }, 'MiMo CLI execution failed');
            reject(new Error(`MiMo CLI error: ${err.message}`));
            return;
          }

          const text = this.parseJsonOutput(stdout);
          resolve(text);
        },
      );
    });
  }

  private parseJsonOutput(stdout: string): string {
    const lines = stdout.split('\n').filter(Boolean);
    const textParts: string[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'text' && event.part?.text) {
          textParts.push(event.part.text);
        }
      } catch {
        // non-JSON line, skip
      }
    }

    return textParts.join('\n').trim();
  }
}
