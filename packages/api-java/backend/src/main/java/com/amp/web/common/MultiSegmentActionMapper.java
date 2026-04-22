package com.amp.web.common;

import com.opensymphony.xwork2.config.Configuration;
import com.opensymphony.xwork2.config.ConfigurationManager;
import com.opensymphony.xwork2.config.entities.PackageConfig;
import org.apache.struts2.dispatcher.mapper.ActionMapping;
import org.apache.struts2.dispatcher.mapper.DefaultActionMapper;

/**
 * Struts' DefaultActionMapper splits a URL into namespace + action-name using
 * the LAST slash, so `/api/billing/invoices/inv_1001` becomes
 * namespace=`/api/billing/invoices` + action=`inv_1001` — and since we never
 * declare the `/api/billing/invoices` namespace, the wildcard action
 * `invoices/*` inside the `/api/billing` package is never tried.
 *
 * This mapper instead finds the longest DECLARED namespace that is a prefix
 * of the URL and uses the entire tail (slashes and all) as the action name.
 * That makes Struts wildcard patterns like `invoices/*` and `invoices/* /pay`
 * work, which is what the Node Express routes require for 1-to-1 parity.
 *
 * When the URL is exactly a declared namespace (e.g. `/api/accounts` with no
 * trailing segment) the action name is set to {@value #BARE_NAMESPACE_ACTION}
 * so the literal action beats the sibling `*` wildcard — which would
 * otherwise capture the empty string and dispatch to the wrong handler.
 */
public class MultiSegmentActionMapper extends DefaultActionMapper {
    /**
     * Action name used when the request URI exactly equals a declared
     * namespace. Packages that want to serve the bare URL must declare an
     * `<action name="index" ...>` entry.
     */
    public static final String BARE_NAMESPACE_ACTION = "index";

    @Override
    protected void parseNameAndNamespace(String uri, ActionMapping mapping,
                                         ConfigurationManager configManager) {
        String namespace = "";
        boolean rootDeclared = false;
        Configuration config = configManager.getConfiguration();
        for (PackageConfig cfg : config.getPackageConfigs().values()) {
            String ns = cfg.getNamespace();
            if (ns == null || ns.isEmpty()) continue;
            boolean matches = ns.equals(uri) || uri.startsWith(ns + "/") || "/".equals(ns);
            if (!matches) continue;
            // Only the root namespace "/" and namespaces that actually prefix
            // the URL count; pick the longest one so nested packages win.
            if ("/".equals(ns)) {
                rootDeclared = true;
                continue;
            }
            if (ns.length() > namespace.length()) {
                namespace = ns;
            }
        }

        String name;
        if (!namespace.isEmpty()) {
            if (uri.equals(namespace) || (namespace + "/").equals(uri)) {
                name = BARE_NAMESPACE_ACTION;
            } else {
                name = uri.substring(namespace.length() + 1);
            }
        } else if (rootDeclared) {
            namespace = "/";
            name = uri.startsWith("/") ? uri.substring(1) : uri;
        } else {
            int lastSlash = uri.lastIndexOf('/');
            if (lastSlash <= 0) {
                namespace = "";
                name = uri.startsWith("/") ? uri.substring(1) : uri;
            } else {
                namespace = uri.substring(0, lastSlash);
                name = uri.substring(lastSlash + 1);
            }
        }

        mapping.setNamespace(namespace);
        mapping.setName(cleanupActionName(name));
    }
}
