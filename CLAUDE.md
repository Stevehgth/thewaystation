# CLAUDE.md — thewaystation.co.za

Static placeholder site. Public repo `Stevehgth/thewaystation`, standalone and gitignored
from the ops vault.

- Keep it dependency-free, with no external requests. The CSP is `default-src 'self'`, so
  no inline scripts or styles and no third-party fonts or CDNs.
- The story text in `site/scene.js` (`CAPTIONS`) and `site/index.html` (`#story`) must stay
  in sync, and must be Steve's wording verbatim.
- Deploy only through the VPS approval gate (`ssh netcup-deploy deploy thewaystation <sha>`).
  Never publish a host port. Box rules live in the ops vault at `20-projects/Netcup-VPS/CLAUDE.md`.
