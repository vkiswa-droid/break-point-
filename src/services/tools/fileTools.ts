import { toolRegistry } from './toolRegistry';

// Virtual sandbox workspace for user-approved notes & documents
const notesStorage: Map<string, { title: string; content: string; updatedAt: string }> = new Map();

// Seed initial notes
notesStorage.set('project_blueprint.md', {
  title: 'project_blueprint.md',
  content: `# BREAK POINT ARCHITECTURE BLUEPRINT\n- High Priority: Wake-word trigger 'Break Point'\n- Core: J.A.R.V.I.S. multi-modal assistant\n- Local Memory: SQLite FTS\n- Tools: System, Files, App launcher, Web research`,
  updatedAt: new Date().toISOString()
});

export function registerFileTools() {
  // 1. Create or Save Note
  toolRegistry.registerTool(
    {
      name: 'create_note',
      description: 'Creates or updates a note file in the user approved notes directory.',
      category: 'files',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Name or filename of the note (e.g. "meeting_notes.md").'
          },
          content: {
            type: 'string',
            description: 'The markdown or text content of the note.'
          }
        },
        required: ['title', 'content']
      },
      requiresConfirmation: false
    },
    async ({ title, content }) => {
      const filename = title.endsWith('.md') || title.endsWith('.txt') ? title : `${title}.md`;
      notesStorage.set(filename, {
        title: filename,
        content,
        updatedAt: new Date().toISOString()
      });
      return {
        success: true,
        filename,
        bytes: content.length,
        message: `Note "${filename}" saved successfully.`
      };
    }
  );

  // 2. Read Document
  toolRegistry.registerTool(
    {
      name: 'read_document',
      description: 'Reads content of a supported document (.txt, .md, .json, .csv) from the approved workspace.',
      category: 'files',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Name of the document to read.'
          }
        },
        required: ['filename']
      },
      requiresConfirmation: false
    },
    async ({ filename }) => {
      const doc = notesStorage.get(filename);
      if (!doc) {
        // Return list of available documents
        const available = Array.from(notesStorage.keys()).join(', ');
        throw new Error(`File "${filename}" not found in approved workspace. Available documents: ${available}`);
      }
      return {
        filename: doc.title,
        content: doc.content,
        updatedAt: doc.updatedAt,
        lines: doc.content.split('\n').length
      };
    }
  );

  // 3. Search Approved Workspace Files
  toolRegistry.registerTool(
    {
      name: 'search_files',
      description: 'Searches filenames and contents across user-approved directories.',
      category: 'files',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term or keyword to find across files.'
          }
        },
        required: ['query']
      },
      requiresConfirmation: false
    },
    async ({ query }) => {
      const lower = query.toLowerCase();
      const matches: any[] = [];
      notesStorage.forEach((item, name) => {
        if (name.toLowerCase().includes(lower) || item.content.toLowerCase().includes(lower)) {
          matches.push({
            filename: name,
            preview: item.content.slice(0, 150),
            updatedAt: item.updatedAt
          });
        }
      });
      return {
        query,
        matchCount: matches.length,
        results: matches
      };
    }
  );

  // 4. Delete File (Requires Explicit User Confirmation!)
  toolRegistry.registerTool(
    {
      name: 'delete_file',
      description: 'Deletes a document from the approved workspace. High-impact action requiring user confirmation.',
      category: 'files',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Filename of the document to permanently remove.'
          }
        },
        required: ['filename']
      },
      requiresConfirmation: true // Security Gate
    },
    async ({ filename }) => {
      if (!notesStorage.has(filename)) {
        throw new Error(`Cannot delete: File "${filename}" does not exist.`);
      }
      notesStorage.delete(filename);
      return {
        success: true,
        deletedFile: filename,
        message: `File "${filename}" has been permanently removed.`
      };
    }
  );
}

export function getAllSavedNotes() {
  return Array.from(notesStorage.values());
}
