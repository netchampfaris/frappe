"""frappe.sync — server-side pieces for the local-first sync layer.

Exposes:
- `view(name, depends_on=[...])` — declare a server view (enriched query).
- `sync.pull` / `sync.push` — whitelisted endpoints; see api.py.
- `notify_change(...)` — hook called on Document.notify_update() for opted-in doctypes.

Sync Log rows are the cursor: name is autoincremented, so `MAX(name)` is the tip.
"""

from frappe.sync.views import view, get_view, list_views  # noqa: F401
from frappe.sync.api import pull, push  # noqa: F401
