import	React			from	'react';
import	Head			from	'next/head';
import	{DefaultSeo}	from	'next-seo';
import	meta			from	'public/manifest.json';

function	Meta() {
	return (
		<>
			<Head>
				<title>{meta.name}</title>
				<meta httpEquiv={'X-UA-Compatible'} content={'IE=edge'} />
				<meta name={'viewport'} content={'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover'} />
				<meta name={'description'} content={meta.name} />
				<meta name={'git-url'} content={meta.github} />
				<meta name={'msapplication-TileColor'} content={meta.title_color} />
				<meta name={'theme-color'} content={meta.theme_color} />

				<meta name={'application-name'} content={meta.name} />
				<meta name={'apple-mobile-web-app-title'} content={meta.name} />
				<meta name={'apple-mobile-web-app-capable'} content={'yes'} />
				<meta name={'apple-mobile-web-app-status-bar-style'} content={'default'} />
				<meta name={'format-detection'} content={'telephone=no'} />
				<meta name={'mobile-web-app-capable'} content={'yes'} />
				<meta name={'msapplication-config'} content={'/favicons/browserconfig.xml'} />
				<meta name={'msapplication-tap-highlight'} content={'no'} />

				<link rel={'manifest'} href={'/manifest.json'} />
				<link rel={'mask-icon'} href={'/favicons/safari-pinned-tab.svg'} color={meta.theme_color} />

				<link rel={'icon'} href={'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>'} />

				<meta name={'robots'} content={'index,nofollow'} />
				<meta name={'googlebot'} content={'index,nofollow'} />
				<meta charSet={'utf-8'} />
			</Head>
			<DefaultSeo
				title={meta.name}
				defaultTitle={meta.name}
				description={meta.description}
				openGraph={{
					type: 'website',
					locale: meta.locale,
					url: meta.uri,
					site_name: meta.name,
					title: meta.name,
					description: meta.description,
					images: [
						{
							url: meta.og,
							width: 1200,
							height: 675,
							alt: meta.name
						}
					]
				}}
				twitter={{
					handle: meta.twitter,
					site: meta.twitter,
					cardType: 'summary_large_image'
				}} />
		</>
	);
}

export default Meta;