import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry } from '../src/services/tools/toolRegistry';
import { initTools } from '../src/services/tools';
import { memoryDatabase } from '../src/services/memory/database';

describe('Tool Registry, Schema Validation & Confirmation Gate', () => {
  beforeEach(() => {
    localStorage.clear();
    initTools();
  });

  it('should register core tools successfully', () => {
    const definitions = toolRegistry.getToolDefinitions();
    const names = definitions.map(d => d.name);
    expect(names).toContain('get_system_time');
    expect(names).toContain('get_system_info');
    expect(names).toContain('create_note');
    expect(names).toContain('read_document');
    expect(names).toContain('open_application');
    expect(names).toContain('delete_file');
  });

  it('should execute get_system_time and return formatted time and date', async () => {
    const res = await toolRegistry.executeTool('get_system_time', {});
    expect(res).toBeDefined();
    expect(res.formattedTime).toBeDefined();
    expect(res.iso).toBeDefined();
    expect(res.timezone).toBeDefined();
  });

  it('should validate required parameters and throw on missing input', async () => {
    // create_note requires 'title' and 'content'
    await expect(toolRegistry.executeTool('create_note', { title: 'test.md' })).rejects.toThrow(
      /Missing required argument "content"/i
    );
  });

  it('should reject application launching for unapproved executables', async () => {
    await expect(
      toolRegistry.executeTool('open_application', { app_name: 'malicious_binary.exe' })
    ).rejects.toThrow(/not on the security allowlist/i);
  });

  it('should require confirmation before executing destructive delete_file tool', async () => {
    // Create a note first
    await toolRegistry.executeTool('create_note', { title: 'temp_doc.md', content: 'Temporary file' });

    // Call delete_file without confirmation context: should trigger confirmation requirement
    let confirmationTriggered = false;
    const confirmPromise = toolRegistry.executeTool('delete_file', { filename: 'temp_doc.md' });

    const pending = toolRegistry.getPendingConfirmations();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].toolName).toBe('delete_file');

    // Resolve confirmation
    toolRegistry.resolveConfirmation(pending[0].id, true);
    const result = await confirmPromise;
    expect(result.success).toBe(true);
    expect(result.deletedFile).toBe('temp_doc.md');
  });

  it('should log all tool executions to the audit trail', async () => {
    await toolRegistry.executeTool('get_system_time', {});
    const audits = memoryDatabase.getToolAudits();
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].toolName).toBe('get_system_time');
    expect(audits[0].status).toBe('success');
  });
});
