import express from 'express';
import cors from 'cors';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

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

app.get('/api/words', async (req, res) => {
  try {
    await ensureWordsDir();
    // Find all .txt files in words directory (recursive)
    const files = await glob('**/*.txt', { cwd: WORDS_DIR });
    
    let allWords = [];

    for (const file of files) {
      const content = await fs.readFile(path.join(WORDS_DIR, file), 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Split by first # or space? Let's stick to # for clear separation
        // If no #, maybe just the word?
        const parts = trimmed.split('#');
        const word = parts[0].trim();
        const definition = parts.length > 1 ? parts[1].trim() : '';
        
        if (word) {
          allWords.push({
            word,
            definition,
            source: file
          });
        }
      });
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
