import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const paper = '#fbfaf7';

export default defineConfig({
	headLinkOptions: { preset: '2023' },
	preset: {
		...minimal2023Preset,
		maskable: {
			...minimal2023Preset.maskable,
			padding: 0,
			resizeOptions: { fit: 'contain', background: paper }
		},
		apple: {
			...minimal2023Preset.apple,
			padding: 0,
			resizeOptions: { fit: 'contain', background: paper }
		}
	},
	images: ['static/icon-source.svg']
});
