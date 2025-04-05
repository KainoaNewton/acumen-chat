/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	// Completely disable all optimizations that might cause issues
	swcMinify: false,
	reactStrictMode: false,

	// Disable TypeScript and ESLint checks during build
	typescript: {
		ignoreBuildErrors: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},

	// Increase timeouts
	staticPageGenerationTimeout: 2000,

	// Disable image optimization
	images: {
		unoptimized: true,
	},

	// Disable webpack optimizations
	webpack: (config) => {
		config.optimization.minimize = false;
		return config;
	},
};

export default nextConfig;
