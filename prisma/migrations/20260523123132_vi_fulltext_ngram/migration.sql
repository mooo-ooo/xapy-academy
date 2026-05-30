-- Rebuild ArticleTranslation FULLTEXT index with the InnoDB ngram parser.
--
-- The default InnoDB tokenizer splits on whitespace and ignores Vietnamese
-- diacritics inconsistently, hurting precision. The `ngram` parser tokenizes
-- per N-character window (default ngram_token_size = 2), which is what
-- MySQL recommends for CJK and works well for diacritic-heavy languages.
--
-- After this migration:
--   - Queries continue to use MATCH ... AGAINST IN NATURAL LANGUAGE MODE.
--   - 2-character VI tokens (e.g. "đó", "là") become indexable.
--   - The LIKE fallback in lib/data/search.ts still catches the long-tail.

ALTER TABLE `ArticleTranslation`
  DROP INDEX `ArticleTranslation_title_excerpt_bodyMdx_idx`;

ALTER TABLE `ArticleTranslation`
  ADD FULLTEXT INDEX `ArticleTranslation_title_excerpt_bodyMdx_idx`
  (`title`, `excerpt`, `bodyMdx`) WITH PARSER ngram;
