use url::Url;

const APP_ORIGIN: &str = "https://clarity-loop-books.vercel.app";
const APP_HOST: &str = "clarity-loop-books.vercel.app";

#[derive(Debug, PartialEq, Eq)]
enum NavigationAction {
    AllowEmbedded,
    OpenExternal,
    Block,
}

fn navigation_action(url: &Url) -> NavigationAction {
    if url.scheme() == "https"
        && url.host_str() == Some(APP_HOST)
        && url.port_or_known_default() == Some(443)
    {
        NavigationAction::AllowEmbedded
    } else if url.scheme() == "https"
        && !url
            .host_str()
            .is_some_and(|host| host.starts_with(&format!("{APP_HOST}.")))
    {
        NavigationAction::OpenExternal
    } else {
        NavigationAction::Block
    }
}

fn navigation_policy<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("navigation-policy")
        .on_navigation(|_webview, url| match navigation_action(url) {
            NavigationAction::AllowEmbedded => true,
            NavigationAction::OpenExternal => {
                let _ = webbrowser::open(url.as_str());
                false
            }
            NavigationAction::Block => false,
        })
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(navigation_policy())
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| panic!("failed to run {APP_ORIGIN}: {error}"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_only_the_production_origin_inside_the_webview() {
        assert_eq!(
            navigation_action(&Url::parse(APP_ORIGIN).unwrap()),
            NavigationAction::AllowEmbedded
        );
        assert_eq!(
            navigation_action(
                &Url::parse("https://clarity-loop-books.vercel.app/studio?draft=1").unwrap()
            ),
            NavigationAction::AllowEmbedded
        );
    }

    #[test]
    fn blocks_downgrades_and_deceptive_subdomains() {
        for url in [
            "http://clarity-loop-books.vercel.app",
            "https://clarity-loop-books.vercel.app.evil.example",
            "javascript:alert('blocked')",
        ] {
            assert_eq!(
                navigation_action(&Url::parse(url).unwrap()),
                NavigationAction::Block
            );
        }
    }

    #[test]
    fn opens_unrelated_https_hosts_outside_the_webview() {
        assert_eq!(
            navigation_action(&Url::parse("https://example.com/docs").unwrap()),
            NavigationAction::OpenExternal
        );
    }
}
