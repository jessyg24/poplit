import { loadContentTaxonomy } from "../actions";
import { ContentTaxonomyManager } from "./actions";

export default async function ContentPage() {
  const { taxonomy, error } = await loadContentTaxonomy();

  if (error || !taxonomy) {
    return <p className="text-red-500">Error loading content taxonomy: {error}</p>;
  }

  return <ContentTaxonomyManager initialTaxonomy={taxonomy} />;
}
