import express, { Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import cors from 'cors';

const app = express();
const port = 5000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const cleanText = (text: string): string => {
  let cleanedText = text;

  cleanedText = cleanedText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  cleanedText = cleanedText.replace(/\bReferences\b.*$/, '').trim();
  return cleanedText;
};

app.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
      }

      const pdfBuffer = req.file.buffer;

      const data = await pdfParse(pdfBuffer);
      const text = cleanText(data.text);

      res.status(200).json({ text });
    } catch (error: any) {
      console.error('Error processing PDF:', error.message);
      res.status(500).send({ error: 'Failed to extract text from PDF' });
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
