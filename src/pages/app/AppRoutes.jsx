import { LibraryProvider } from "../../lib/library-context.jsx";
import { matchPath } from "../../lib/router.jsx";
import { SECTIONS } from "../../lib/resources.js";
import AppShell from "./AppShell.jsx";
import AppHome from "./AppHome.jsx";
import ResourcePage from "./ResourcePage.jsx";
import LicensePage from "./LicensePage.jsx";
import { ComparePage, FavoritesPage, RecentPage, ResourceListPage } from "./ListPages.jsx";
import { CollectionPage, CollectionsPage } from "./CollectionPages.jsx";
import { NotFound } from "../AccountPages.jsx";

// Sistema autenticado (/app/*). A licença já foi validada no servidor antes de chegar aqui.
export default function AppRoutes({ path, account }) {
  let page;
  const section = SECTIONS.find((s) => path === `/app/${s.route}`);
  const resource = matchPath("/app/recursos/:id", path);
  const collection = matchPath("/app/colecoes/:id", path);
  if (path === "/app") page = <AppHome account={account}/>;
  else if (section) page = <ResourceListPage key={section.route} section={section.route}/>;
  else if (path === "/app/buscar") page = <ResourceListPage key="buscar"/>;
  else if (resource) page = <ResourcePage key={resource.id} id={resource.id}/>;
  else if (path === "/app/colecoes") page = <CollectionsPage/>;
  else if (collection) page = <CollectionPage id={collection.id}/>;
  else if (path === "/app/favoritos") page = <FavoritesPage/>;
  else if (path === "/app/recentes") page = <RecentPage/>;
  else if (path === "/app/comparar") page = <ComparePage/>;
  else if (path === "/app/minha-licenca") page = <LicensePage account={account}/>;
  else page = <NotFound inApp/>;
  return <LibraryProvider><AppShell path={path} account={account}>{page}</AppShell></LibraryProvider>;
}
