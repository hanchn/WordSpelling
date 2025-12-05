import express from 'express';
import cors from 'cors';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;

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
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;
        const dirPath = path.join(WORDS_DIR, dirName);
        // Get json files in this dir
        const files = await glob('*.json', { cwd: dirPath });
        if (files.length > 0) {
          structure[dirName] = files;
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
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
    let searchPattern = '**/*.json';

    if (book) {
      if (book === 'Default') {
        searchCwd = WORDS_DIR;
        searchPattern = '*.json';
      } else {
        const safeBook = path.basename(book);
        searchCwd = path.join(WORDS_DIR, safeBook);
        try {
          await fs.access(searchCwd);
        } catch {
          return res.json([]); 
        }
        
        if (file) {
          const safeFile = path.basename(file);
          searchPattern = safeFile;
        } else {
          searchPattern = '*.json';
        }
      }
    }

    const files = await glob(searchPattern, { cwd: searchCwd });
    
    let allWords = [];

    for (const f of files) {
      const fullPath = path.join(searchCwd, f);
      
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const json = JSON.parse(content);
        
        if (json.words && Array.isArray(json.words)) {
           // Map JSON words to our internal format (ensure backward compat if needed)
           const mappedWords = json.words.map(w => ({
             ...w,
             source: book ? (file ? file : `${book}/${f}`) : f
           }));
           allWords.push(...mappedWords);
        }
      } catch (e) {
        console.error('Error parsing JSON:', fullPath, e);
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
