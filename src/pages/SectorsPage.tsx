import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getSectors,
  type Sector,
} from "../api/sectors.api";

export function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    getSectors().then((r) => setSectors(r.items));
  }, []);

  return (
    <div className="space-y-4">
      {sectors.map((sector) => (
        <Link
          key={sector.id}
          to={`/sectors/${sector.id}/story`}
          className="block rounded-lg border border-slate-700 p-4"
        >
          <h2>{sector.name}</h2>

          <p>{sector.sectorCode}</p>
        </Link>
      ))}
    </div>
  );
}