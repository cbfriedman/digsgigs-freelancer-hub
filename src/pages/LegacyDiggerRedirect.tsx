import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DiggerDetail from "./DiggerDetail";
import { getCanonicalDiggerProfilePath, normalizeHandle } from "@/lib/profileUrls";

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function LegacyDiggerRedirect() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [readyToRenderLegacy, setReadyToRenderLegacy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setReadyToRenderLegacy(false);

      // Legacy handle route: /digger/:handle -> canonical /profile/:handle/digger
      if (!isUuid(id)) {
        const canonicalByHandle = getCanonicalDiggerProfilePath({ handle: normalizeHandle(id) });
        if (canonicalByHandle && canonicalByHandle !== location.pathname) {
          navigate(`${canonicalByHandle}${location.search}${location.hash}`, { replace: true });
          return;
        }
        if (!cancelled) setReadyToRenderLegacy(true);
        return;
      }

      // UUID: render DiggerDetail directly (full profile page).
      // Do not redirect to /profile/:handle/digger — that route shows a summary card.
      // Users clicking "Open Full Digger Profile" expect to see the full profile here.
      if (!cancelled) setReadyToRenderLegacy(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, location.hash, location.pathname, location.search, navigate]);

  if (!readyToRenderLegacy) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DiggerDetail />;
}
