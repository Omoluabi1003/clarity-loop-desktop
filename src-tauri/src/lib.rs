use url::Url;

const APP_ORIGIN: &str = "https://clarity-loop-books.vercel.app";

fn is_allowed_navigation(url: &Url) -> bool {
    url.scheme() == "https"
        && url.host_str() == Some("clarity-loop-books.vercel.app")
        && url.port_or_known_default() == Some(443)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_navigation(|_webview, url| {
            if is_allowed_navigation(url) {
                return true;
            }

            if matches!(url.scheme(), "http" | "https") {
                let _ = webbrowser::open(url.as_str());
            }

            false
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| panic!("failed to run {APP_ORIGIN}: {error}"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_only_the_production_origin() {
        assert!(is_allowed_navigation(&Url::parse(APP_ORIGIN).unwrap()));
        assert!(is_allowed_navigation(
            &Url::parse("https://clarity-loop-books.vercel.app/studio?draft=1").unwrap()
        ));
        assert!(!is_allowed_navigation(
            &Url::parse("http://clarity-loop-books.vercel.app").unwrap()
        ));
        assert!(!is_allowed_navigation(
            &Url::parse("https://example.com").unwrap()
        ));
        assert!(!is_allowed_navigation(
            &Url::parse("https://clarity-loop-books.vercel.app.evil.example").unwrap()
        ));
    }
}
