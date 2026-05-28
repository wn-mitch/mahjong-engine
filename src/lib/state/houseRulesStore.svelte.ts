// Table house rules — preferences that change how a hand may be won, not just how it's drawn. Like
// themeStore these are genuinely global and client-only (ssr = false), so a module-level runes
// singleton is safe, and persisting them means a group's table conventions survive a reload.

function detectAllowConcealed(): boolean {
	try {
		const stored = localStorage.getItem('allow-concealed');
		// Default to true: the engine surfaces concealed lines unless the user opts into standard
		// "concealed lost on exposure" enforcement.
		return stored === null ? true : stored === 'true';
	} catch {
		return true;
	}
}

let allowConcealed = $state<boolean>(detectAllowConcealed());

function setAllowConcealed(value: boolean) {
	allowConcealed = value;
	try {
		localStorage.setItem('allow-concealed', String(value));
	} catch {
		// storage unavailable — in-memory state still works for the session
	}
}

export const houseRulesStore = {
	get allowConcealed(): boolean {
		return allowConcealed;
	},
	setAllowConcealed,
	toggleAllowConcealed() {
		setAllowConcealed(!allowConcealed);
	}
};
