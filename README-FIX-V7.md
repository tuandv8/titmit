# Learning Hub V7 — Curriculum Vocabulary + Mindmap

## Vocabulary research basis
- Vietnam GDPT 2018 English: primary Grades 3–5 target about 600–700 words for the whole primary stage; lower secondary adds about 800–1000 words; upper secondary adds about 600–800 words. These are stage-level requirements, not official per-grade quotas.
- The app therefore uses cumulative planning targets per grade: G1 80, G2 160, G3 300, G4 480, G5 650, G6 850, G7 1080, G8 1320, G9 1550, G10 1750. These are app design targets, not Ministry quotas.
- Oxford 3000 CEFR-tagged data is fetched at runtime and filtered by level/part of speech to populate the larger class lists. Existing hand-curated words are preserved as seeds.

## Mindmap Vocabulary
- Added menu item under each grade.
- 8 word-family/root tabs per grade.
- Center = root/base word; surrounding nodes = derived forms, compounds and useful phrases.
- Advanced extensions deliberately go beyond the grade band to create a bridge to later learning.

## Sources
- Vietnam Ministry curriculum / official programme: https://moet.gov.vn/
- Oxford 3000 dataset used by the app: https://github.com/chunzhng/Oxford-3000-5000
- British Council Word Family Framework: https://www.teachingenglish.org.uk/professional-development/teachers/planning-lessons-and-courses/articles/word-family-framework

## Deployment
Replace/add `app.js`, `curriculum-data.js`, `index.html`, `styles.css`. The expanded Oxford list is loaded from the public CSV at runtime; if it is unavailable, the existing bundled seed vocabulary remains available.

```bash
git add app.js curriculum-data.js index.html styles.css README-FIX-V7.md
git commit -m "Add curriculum vocabulary and vocabulary mindmaps"
git push
```
