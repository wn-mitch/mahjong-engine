// Tracks whether to nudge the user to install the app to their home screen / desktop. The store
// captures two very different install paths: iOS Safari (no API — we can only *teach* the user to
// tap Share → "Add to Home Screen") and Chromium browsers (the `beforeinstallprompt` event lets us
// trigger the native install dialog from a button). The modal that consumes this picks a branch by
// the `platform` field. The store is module-level for the same reason themeStore is: the app is a
// static SPA with `ssr = false`, so a singleton is safe.

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'other';

// Subset of the spec'd BeforeInstallPromptEvent — typed loosely because lib.dom does not include it.
interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'install-prompt-dismissed';

function readDismissed(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function writeDismissed() {
	try {
		localStorage.setItem(STORAGE_KEY, '1');
	} catch {
		// storage unavailable (Safari private mode is the realistic case for iOS users) —
		// in-memory dismissal still hides the prompt for the rest of the session.
	}
}

export function detectPlatform(ua: string): InstallPlatform {
	// iPadOS 13+ reports as desktop Safari by default; fall back to touch + Apple vendor.
	const isIos =
		/iPad|iPhone|iPod/.test(ua) ||
		(typeof navigator !== 'undefined' &&
			navigator.maxTouchPoints > 1 &&
			/Macintosh/.test(ua) &&
			'standalone' in navigator);
	if (isIos) return 'ios';
	if (/Android/i.test(ua)) return 'android';
	if (/Mobi/i.test(ua)) return 'other';
	return 'desktop';
}

function detectStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
	// Safari's non-standard iOS flag. Typed as `any` because lib.dom does not declare it.
	const nav = navigator as unknown as { standalone?: boolean };
	return nav.standalone === true;
}

let platform = $state<InstallPlatform>('other');
let isStandalone = $state(false);
let isDismissed = $state(false);
let installEvent = $state<BeforeInstallPromptEvent | null>(null);
let initialized = false;

function init() {
	if (initialized || typeof window === 'undefined') return;
	initialized = true;
	platform = detectPlatform(navigator.userAgent);
	isStandalone = detectStandalone();
	isDismissed = readDismissed();

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installEvent = e as BeforeInstallPromptEvent;
	});

	window.addEventListener('appinstalled', () => {
		installEvent = null;
		isStandalone = true;
		writeDismissed();
		isDismissed = true;
	});
}

init();

function dismiss() {
	isDismissed = true;
	writeDismissed();
}

async function install() {
	const ev = installEvent;
	if (!ev) return;
	await ev.prompt();
	const { outcome } = await ev.userChoice;
	installEvent = null;
	if (outcome === 'accepted') {
		isDismissed = true;
		writeDismissed();
	}
}

export const installPromptStore = {
	get platform(): InstallPlatform {
		return platform;
	},
	get isStandalone(): boolean {
		return isStandalone;
	},
	get isDismissed(): boolean {
		return isDismissed;
	},
	get canPromptNatively(): boolean {
		return installEvent !== null;
	},
	get shouldShow(): boolean {
		if (isStandalone || isDismissed) return false;
		// iOS has no API, so we always show the instructional sheet (until dismissed). Everywhere
		// else, only show once the browser has emitted `beforeinstallprompt` — otherwise we have no
		// way to trigger install and an "Install" button would do nothing.
		return platform === 'ios' || installEvent !== null;
	},
	dismiss,
	install
};
