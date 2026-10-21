-- Renomeia a plataforma para Voxelia. Só textos de exibição; códigos e chaves não mudam.
update public.commercial_editions
set name = 'Voxelia — Edição 1', updated_at = now()
where code = 'edicao-1' and name in ('Arsenal IA — Edição 1', 'Biblioteca Total — Edição 1');
