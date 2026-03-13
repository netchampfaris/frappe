import time
import uuid
from typing import Any

import jwt
import requests

import frappe
from frappe import _
from frappe.utils import get_url


_IAB_ONE_TIME_ISS = "frappe-parent"
_IAB_ONE_TIME_AUD = "press-iab-exchange"


def get_base_url():
    url = "https://frappecloud.com"
    if frappe.conf.developer_mode and frappe.conf.get("fc_base_url"):
        url = frappe.conf.get("fc_base_url")
    return url


def _get_fc_base_url() -> str:
    # Allow local/staging FC targets via site_config.
    return (frappe.conf.get("fc_base_url") or get_base_url()).rstrip("/")


def _get_iab_shared_secret() -> str:
    # Align with Press site-level verification by preferring per-site communication secret.
    # Keep iab_shared_secret as fallback for transitional setups.
    return frappe.conf.get("fc_communication_secret") or frappe.conf.get(
        "iab_shared_secret"
    )


def _require_iab_mint_permission(site_name: str) -> None:
    """
    Phase-1 policy: only System Manager can mint embed tokens.
    Replace with finer site-level authorization once site-level mapping exists.
    """
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        frappe.throw(
            _("Not permitted to mint billing embed token"), frappe.PermissionError
        )


def get_site_login_url():
    return f"{get_base_url()}/dashboard/site-login"


def get_site_name():
    site_name = frappe.local.site
    if frappe.conf.developer_mode and frappe.conf.get("saas_billing_site_name"):
        site_name = frappe.conf.get("saas_billing_site_name")
    return site_name


def get_headers():
    # check if user is system manager
    if frappe.get_roles(frappe.session.user).count("System Manager") == 0:
        frappe.throw(_("You are not allowed to access this resource"))

    # check if communication secret is set
    # if not frappe.conf.get("fc_communication_secret"):
    # 	frappe.throw(_("Communication secret not set"))

    return {
        "X-Site-Token": frappe.conf.get("fc_communication_secret"),
        "X-Site-User": frappe.session.user,
        "X-Site": get_site_name(),
    }


@frappe.whitelist()
def current_site_info():
    from frappe.utils import cint

    request = requests.post(
        f"{get_base_url()}/api/method/press.saas.api.site.info", headers=get_headers()
    )
    if request.status_code == 200:
        res = request.json().get("message")
        if not res:
            return None

        return {
            **res,
            "site_name": get_site_name(),
            "base_url": get_base_url(),
            "setup_complete": cint(frappe.get_system_settings("setup_complete")),
        }

    else:
        # frappe.throw(_("Failed to get site info"))
        return None


@frappe.whitelist()
def api(method: str, data: str | dict[str, Any] | None = None):
    if data is None:
        data = {}
    request = requests.post(
        f"{get_base_url()}/api/method/press.saas.api.{method}",
        headers=get_headers(),
        json=data,
    )
    if request.status_code == 200:
        return request.json().get("message")
    else:
        frappe.throw(_("Failed while calling API {0}", method))


@frappe.whitelist()
def is_fc_site() -> bool:
    is_system_manager = frappe.get_roles(frappe.session.user).count("System Manager")
    # return bool(is_system_manager and frappe.conf.get("fc_communication_secret"))
    return bool(is_system_manager)


# login to frappe cloud dashboard
@frappe.whitelist()
def send_verification_code():
    request = requests.post(
        f"{get_base_url()}/api/method/press.api.developer.saas.send_verification_code",
        headers=get_headers(),
        json={"domain": get_site_name()},
    )
    if request.status_code == 200:
        return request.json().get("message")
    else:
        frappe.throw(_("Failed to request login to Frappe Cloud"))


@frappe.whitelist()
def verify_verification_code(verification_code: str, route: str):
    request = requests.post(
        f"{get_base_url()}/api/method/press.api.developer.saas.verify_verification_code",
        headers=get_headers(),
        json={
            "domain": get_site_name(),
            "verification_code": verification_code,
            "route": route,
        },
    )

    if request.status_code == 200:
        return {
            "base_url": get_base_url(),
            "login_token": request.json()["login_token"],
        }
    else:
        frappe.throw(_("Invalid Code. Please try again."))


@frappe.whitelist(methods=["POST"])
def create_press_embed_token(site_name: str):
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)

    if not site_name:
        frappe.throw(_("site_name is required"))

    _require_iab_mint_permission(site_name)

    secret = _get_iab_shared_secret()
    if not secret:
        frappe.throw(
            _(
                "Missing iab_shared_secret (or fallback fc_communication_secret) in parent site_config"
            )
        )

    now = int(time.time())
    ttl = min(int(frappe.conf.get("iab_token_ttl_seconds", 60)), 60)

    # Do not trust parent_origin from client params.
    parent_origin = get_url().rstrip("/").lower()

    payload = {
        "iss": _IAB_ONE_TIME_ISS,
        "aud": _IAB_ONE_TIME_AUD,
        "sub": frappe.session.user,
        "site_name": site_name,
        "parent_origin": parent_origin,
        "scope": ["billing:read", "billing:pay"],
        "jti": str(uuid.uuid4()),
        "iat": now,
        "nbf": now - 5,
        "exp": now + ttl,
    }

    fc_base_url = _get_fc_base_url()
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {
        "token": token,
        "iframe_url": f"{fc_base_url}/dashboard/iab/{site_name}",
        "target_origin": fc_base_url,
        "expires_in": ttl,
    }
