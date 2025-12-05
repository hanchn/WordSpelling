import express from 'express';
import cors from 'cors';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const WORDS_DIR = path.join(__dirname, '../words');

// Ensure words directory exists
async function ensureWordsDir() {
  try {
    await fs.access(WORDS_DIR);
  } catch {
    await fs.mkdir(WORDS_DIR);
    // Create a sample file
    const sampleContent = `test # 试验；测试；检测
apple # 苹果
computer # 计算机；电脑
spelling # 拼写
challenge # 挑战`;
    await fs.writeFile(path.join(WORDS_DIR, 'sample.txt'), sampleContent, 'utf-8');
  }
}

app.get('/api/structure', async (req, res) => {
  try {
    await ensureWordsDir();
    
    const structure = {};
    
    // Read root directory
    const entries = await fs.readdir(WORDS_DIR, { withFileTypes: true });
    
    // 1. Root files (treat 'Root' as a book name or just add them to a default list?)
    // Let's handle directories as Books
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;
        const dirPath = path.join(WORDS_DIR, dirName);
        // Get txt files in this dir
        const files = await glob('*.txt', { cwd: dirPath });
        if (files.length > 0) {
          structure[dirName] = files;
        }
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        // Files in root
        if (!structure['Default']) {
          structure['Default'] = [];
        }
        structure['Default'].push(entry.name);
      }
    }

    res.json(structure);
  } catch (error) {
    console.error('Error listing structure:', error);
    res.status(500).json({ error: 'Failed to list structure' });
  }
});

app.get('/api/words', async (req, res) => {
  try {
    await ensureWordsDir();
    const { book, file } = req.query;
    
    let searchCwd = WORDS_DIR;
    let searchPattern = '**/*.txt';

    if (book) {
      // If book is provided, limit to that folder
      // Handle "Default" special case
      if (book === 'Default') {
        searchCwd = WORDS_DIR;
        searchPattern = '*.txt'; // Only root files
      } else {
        const safeBook = path.basename(book);
        searchCwd = path.join(WORDS_DIR, safeBook);
        // Check if folder exists
        try {
          await fs.access(searchCwd);
        } catch {
          return res.json([]); 
        }
        
        if (file) {
          // If specific file is selected
          const safeFile = path.basename(file);
          searchPattern = safeFile;
        } else {
          // All txt in folder
          searchPattern = '*.txt';
        }
      }
    }

    // Find files
    const files = await glob(searchPattern, { cwd: searchCwd });
    
    let allWords = [];

    for (const f of files) {
      const fullPath = path.join(searchCwd, f);
      // If we are in Default (root), we need to make sure we don't pick up files from subdirs if pattern was **/*.txt
      // But for Default we used *.txt, so it's fine.
      
      // Check if it's a file (glob might return dirs if configured wrong, but default is fine)
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          const parts = trimmed.split('#');
          const word = parts[0].trim();
          const definition = parts.length > 1 ? parts[1].trim() : '';
          
          if (word) {
            allWords.push({
              word,
              definition,
              source: book ? (file ? file : `${book}/${f}`) : f
            });
          }
        });
      } catch (e) {
        // ignore read errors
      }
    }

    res.json(allWords);
  } catch (error) {
    console.error('Error reading words:', error);
    res.status(500).json({ error: 'Failed to load words' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
