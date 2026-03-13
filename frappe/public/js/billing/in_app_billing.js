export function openInAppBillingDialog() {
	const siteName = frappe.boot.site_info?.name;
	if (!siteName) {
		frappe.msgprint(__("Unable to open billing: missing site name."));
		return;
	}

	const READY_TIMEOUT_MS = 15000;
	const REFRESH_TIMEOUT_MS = 10000;
	const MIN_TOKEN_SEND_INTERVAL_MS = 800;

	let billingOrigin = null;
	let pendingToken = null;
	let readyTimeout = null;
	let refreshTimeout = null;
	let isDisposed = false;
	let tokenSendInFlight = false;
	let tokenSendPromise = null;
	let lastTokenSentAt = 0;
	let debugStepCounter = 0;

	function logStep(step, details = null) {
		debugStepCounter += 1;
		if (details === null) {
			console.log(`[IAB parent][${debugStepCounter}] ${step}`);
			return;
		}

		console.log(`[IAB parent][${debugStepCounter}] ${step}`, details);
	}

	const $dialog = new frappe.ui.Dialog({
		title: __("Manage Billing"),
		size: "large",
	});

	$dialog.$body.html(`
		<div class="billing-iframe-container" style="height: 80vh; display: flex; flex-direction: column; gap: 8px;">
			<div id="billing-embed-loading" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--fg-color);">
				<span class="indicator blue" style="margin: 0;"></span>
				<span id="billing-embed-loading-message">${__("Initializing in-app billing...")}</span>
			</div>
			<div id="billing-embed-fallback" style="display: none; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
				<div id="billing-embed-message" style="margin-bottom: 8px;"></div>
				<button class="btn btn-default btn-sm" id="billing-embed-open">${__("Open Billing In New Tab")}</button>
			</div>
			<iframe id="billing-embed-frame" referrerpolicy="origin" src="about:blank" style="width: 100%; height: 100%; border: none;"></iframe>
		</div>
	`);

	$dialog.show();
	$dialog.header.hide();

	const frame = $dialog.$body.find("#billing-embed-frame")[0];
	const $loading = $dialog.$body.find("#billing-embed-loading");
	const $loadingMessage = $dialog.$body.find("#billing-embed-loading-message");
	const $fallback = $dialog.$body.find("#billing-embed-fallback");
	const $fallbackMessage = $dialog.$body.find("#billing-embed-message");

	function setLoading(message) {
		if (message) {
			$loadingMessage.text(message);
		}
		$loading.show();
	}

	function hideLoading() {
		$loading.hide();
	}

	function clearTimers() {
		logStep("Clearing active timers");
		if (readyTimeout) {
			clearTimeout(readyTimeout);
			readyTimeout = null;
		}
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
			refreshTimeout = null;
		}
	}

	function cleanup() {
		if (isDisposed) {
			return;
		}
		logStep("Cleaning up dialog message listeners");
		isDisposed = true;
		clearTimers();
		window.removeEventListener("message", onMessage);
	}

	function showFallback(message) {
		logStep("Showing fallback UI", { message });
		hideLoading();
		$fallbackMessage.text(message || __("Unable to load billing in this window."));
		$fallback.show();
	}

	$dialog.$body.find("#billing-embed-open").on("click", function () {
		openFrappeCloudDashboard();
	});

	$dialog.$wrapper.one("hidden.bs.modal", function () {
		cleanup();
	});

	async function mintToken() {
		logStep("Minting one-time embed token", { siteName });
		const response = await fetch(
			"/api/method/frappe.integrations.frappe_providers.frappecloud_billing.create_press_embed_token",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ site_name: siteName }),
			}
		);

		if (!response.ok) {
			logStep("Token mint failed", { status: response.status });
			throw new Error(`Token mint failed: ${response.status}`);
		}

		const json = await response.json();
		const msg = json?.message;
		if (!msg?.token || !msg?.iframe_url || !msg?.target_origin) {
			logStep("Token mint response missing required fields");
			throw new Error("Token mint response missing required fields");
		}

		logStep("Token mint succeeded", { targetOrigin: msg.target_origin, iframeUrl: msg.iframe_url });

		return msg;
	}

	async function bootstrapFrame() {
		logStep("Bootstrapping billing iframe");
		setLoading(__("Requesting secure billing token..."));
		const msg = await mintToken();
		if (isDisposed) {
			logStep("Bootstrap cancelled because dialog is disposed");
			return;
		}

		billingOrigin = new URL(msg.target_origin).origin;
		pendingToken = msg.token;
		// Press CSP validation for /dashboard/iab/* depends on Referer origin.
		frame.referrerPolicy = "origin";
		frame.src = msg.iframe_url;
		logStep("Iframe source set", { billingOrigin, iframeUrl: msg.iframe_url });
		setLoading(__("Waiting for billing app to initialize..."));

		readyTimeout = setTimeout(() => {
			logStep("Timed out waiting for iframe ready signal");
			showFallback(
				__(
					"Billing embed did not initialize in time. This usually means the iframe load was blocked by origin/CSP mismatch."
				)
			);
		}, READY_TIMEOUT_MS);
	}

	async function sendFreshToken({ force = false } = {}) {
		logStep("Preparing to send token to iframe", { force, hasBillingOrigin: Boolean(billingOrigin) });
		if (!billingOrigin || isDisposed) {
			logStep("Skipped token send due to missing origin or disposed state");
			return null;
		}

		if (!force) {
			const now = Date.now();
			if (now - lastTokenSentAt < MIN_TOKEN_SEND_INTERVAL_MS) {
				logStep("Skipped token send due to throttle", {
					deltaMs: now - lastTokenSentAt,
					minIntervalMs: MIN_TOKEN_SEND_INTERVAL_MS,
				});
				return null;
			}
		}

		if (tokenSendInFlight) {
			logStep("Reusing in-flight token send promise");
			return tokenSendPromise;
		}

		tokenSendInFlight = true;
		tokenSendPromise = (async () => {
			const msg = await mintToken();
			pendingToken = msg.token;

			if (!frame?.contentWindow) {
				throw new Error("Billing frame is not available");
			}

			frame.contentWindow.postMessage(
				{ type: "iab:token", token: pendingToken, siteName },
				billingOrigin,
			);
			logStep("Sent iab:token message to iframe", { billingOrigin });
			pendingToken = null;
			lastTokenSentAt = Date.now();
		})().finally(() => {
			logStep("Token send flow completed");
			tokenSendInFlight = false;
			tokenSendPromise = null;
		});

		return tokenSendPromise;
	}

	async function onMessage(event) {
		if (isDisposed || !billingOrigin) {
			return;
		}
		if (event.source !== frame?.contentWindow) {
			return;
		}
		if (event.origin !== billingOrigin) {
			logStep("Ignored message from unexpected origin", {
				eventOrigin: event.origin,
				expectedOrigin: billingOrigin,
			});
			return;
		}

		if (event.data?.type === "iab:ready") {
			logStep("Received iab:ready from iframe");
			setLoading(__("Establishing secure billing session..."));

			if (readyTimeout) {
				clearTimeout(readyTimeout);
				readyTimeout = null;
			}

			try {
				if (pendingToken) {
					logStep("Sending bootstrap token to iframe");
					frame.contentWindow.postMessage(
						{ type: "iab:token", token: pendingToken, siteName },
						billingOrigin,
					);
					pendingToken = null;
					lastTokenSentAt = Date.now();
				} else {
					logStep("Re-handshake accepted after iframe remount");
					logStep("No pending token found; sending fresh token for ready event");
					await sendFreshToken();
				}
				logStep("Iframe billing session established");
				hideLoading();
			} catch (error) {
				logStep("Failed to establish iframe session", { error: error?.message || "unknown_error" });
				showFallback(__("Unable to initialize billing session."));
			}
			return;
		}

		if (event.data?.type === "iab:refresh-request") {
			logStep("Received iab:refresh-request from iframe");
			setLoading(__("Refreshing billing session..."));
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}

			refreshTimeout = setTimeout(() => {
				logStep("Timed out waiting for refresh token send completion");
				showFallback(__("Timed out while refreshing billing session."));
			}, REFRESH_TIMEOUT_MS);

			try {
				// Refresh requests can arrive immediately after bootstrap; bypass rate limit here.
				await sendFreshToken({ force: true });
				logStep("Refresh token sent successfully");
				hideLoading();
				clearTimeout(refreshTimeout);
				refreshTimeout = null;
			} catch (error) {
				logStep("Failed to send refresh token", { error: error?.message || "unknown_error" });
				clearTimeout(refreshTimeout);
				refreshTimeout = null;
				showFallback(__("Failed to refresh billing session."));
			}
		}
	}

	window.addEventListener("message", onMessage);
	logStep("Registered parent window message listener");

	bootstrapFrame().catch(() => {
		logStep("Bootstrap flow failed");
		showFallback(__("Unable to start billing embed."));
	});
}
