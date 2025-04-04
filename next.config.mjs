/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	swcMinify: true,
	reactStrictMode: false,
	typescript: {
		ignoreBuildErrors: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	staticPageGenerationTimeout: 1000,
};

export default nextConfig;
