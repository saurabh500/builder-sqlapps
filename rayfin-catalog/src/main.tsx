import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { createCatalog, type Product, type ProductDetails } from './catalog';

const catalog = createCatalog();
type Page = Awaited<ReturnType<typeof catalog.read>>;
type Result = { page: Page } | { error: string };

function CatalogPage() {
  const [cursor, setCursor] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [attempt, retry] = useState(0);
  const [editor, setEditor] = useState<{ product?: Product }>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let current = true;
    catalog.read(cursor).then(
      page => { if (current) setResult({ page }); },
      error => {
        if (current) setResult({ error: error?.status === 401
          ? 'Sign in to view the catalog.'
          : 'The catalog could not be loaded. Try again in a moment.' });
      },
    );
    return () => { current = false; };
  }, [cursor, attempt]);

  function goTo(next?: string) {
    setResult(undefined);
    if (cursor === next) retry(count => count + 1);
    else setCursor(next);
  }

  function openEditor(product?: Product) {
    setSaveError('');
    setNotice('');
    setEditor({ product });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    const details: ProductDetails = {
      name: String(fields.get('name')).trim(),
      category: String(fields.get('category')).trim(),
      description: String(fields.get('description')).trim(),
    };
    if (Object.values(details).some(value => !value)) {
      setSaveError('Enter a name, category, and description.');
      return;
    }
    const id = editor?.product?.id;
    setSaving(true);
    setSaveError('');
    try {
      await catalog.save(details, id);
      setNotice(id === undefined ? 'Product added.' : 'Product updated.');
      setEditor(undefined);
      goTo(id === undefined ? undefined : cursor);
    } catch (error) {
      console.error('Catalog save failed', error);
      setSaveError('The product could not be saved. Check the catalog before trying again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">ShopStream / Catalog studio</p>
          <h1>Product catalog</h1>
          <p>Browse the collection, add new finds, and keep product details up to date.</p>
        </div>
        <button className="primary" onClick={() => openEditor()} disabled={!!editor}>+ Add product</button>
      </header>
      {notice && <p className="notice" role="status">{notice}</p>}
      {editor && <form onSubmit={save} aria-labelledby="editor-title">
        <h2 id="editor-title">{editor.product ? 'Edit product' : 'Add product'}</h2>
        <fieldset disabled={saving}>
          <label>Product name<input name="name" defaultValue={editor.product?.name} required maxLength={100} autoFocus /></label>
          <label>Category<input name="category" defaultValue={editor.product?.category} required maxLength={80} /></label>
          <label className="wide">Description<textarea name="description" defaultValue={editor.product?.description} required maxLength={250} rows={3} /></label>
        </fieldset>
        {saveError && <p role="alert">{saveError}</p>}
        <div className="actions">
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
          <button type="button" onClick={() => setEditor(undefined)} disabled={saving}>Cancel</button>
        </div>
      </form>}
      <section aria-label="Products" aria-busy={!result}>
        {!result ? <p role="status">Loading products...</p> :
          'error' in result ? <>
            <p role="alert">{result.error}</p>
            <button onClick={() => goTo(cursor)}>Try again</button>
          </> : <>
            {result.page.items.length === 0 ? <p>No products to show.</p> :
              <ul>{result.page.items.map(product => (
                <li key={product.id}>
                  <p className="tag">{product.category}</p>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <button onClick={() => openEditor(product)} disabled={!!editor} aria-label={`Edit ${product.name}`}>Edit</button>
                </li>
              ))}</ul>}
            <nav aria-label="Catalog pages">
              {cursor && <button onClick={() => goTo()} disabled={!!editor}>First page</button>}
              {result.page.hasNextPage && result.page.endCursor &&
                <button onClick={() => goTo(result.page.endCursor ?? undefined)} disabled={!!editor}>Next page</button>}
            </nav>
          </>}
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing catalog root element.');
createRoot(root).render(<CatalogPage />);
