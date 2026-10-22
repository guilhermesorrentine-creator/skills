-- Renomeia a plataforma para Arsenal IA. Só textos de exibição; códigos e chaves não mudam.
update public.commercial_editions
set name = 'Arsenal IA — Edição 1', updated_at = now()
where code = 'edicao-1' and name = 'Biblioteca Total — Edição 1';
