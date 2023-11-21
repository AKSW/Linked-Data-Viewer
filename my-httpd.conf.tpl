ServerRoot "/usr/local/apache2"
Listen 80
LoadModule mpm_event_module modules/mod_mpm_event.so
#LoadModule authn_file_module modules/mod_authn_file.so
#LoadModule authn_core_module modules/mod_authn_core.so
#LoadModule authz_host_module modules/mod_authz_host.so
#LoadModule authz_groupfile_module modules/mod_authz_groupfile.so
#LoadModule authz_user_module modules/mod_authz_user.so
LoadModule authz_core_module modules/mod_authz_core.so
#LoadModule access_compat_module modules/mod_access_compat.so
#LoadModule auth_basic_module modules/mod_auth_basic.so
LoadModule reqtimeout_module modules/mod_reqtimeout.so
LoadModule filter_module modules/mod_filter.so
LoadModule mime_module modules/mod_mime.so
LoadModule log_config_module modules/mod_log_config.so
LoadModule env_module modules/mod_env.so
LoadModule headers_module modules/mod_headers.so
LoadModule setenvif_module modules/mod_setenvif.so
LoadModule version_module modules/mod_version.so
LoadModule unixd_module modules/mod_unixd.so
LoadModule status_module modules/mod_status.so
#LoadModule autoindex_module modules/mod_autoindex.so
LoadModule alias_module modules/mod_alias.so
LoadModule dir_module modules/mod_dir.so
#LoadModule proxy_module modules/mod_proxy.so
#ProxyRequests Off
LoadModule rewrite_module modules/mod_rewrite.so
<IfModule unixd_module>
User www-data
Group www-data
</IfModule>
ServerAdmin admin@localhost
	AllowEncodedSlashes On
<Directory />
    AllowOverride none
    Require all denied
</Directory>
DocumentRoot "/usr/local/apache2/htdocs"
<Directory "/usr/local/apache2/htdocs">
    Options Indexes FollowSymLinks
#    AllowOverride All
    Require all granted

        FallbackResource /_/resource.html

    RewriteEngine On
    RewriteCond "%{HTTP_ACCEPT}" !text/html
    RewriteCond "%{THE_REQUEST}" \ (.+)\ HTTP/
    RewriteRule .+ "@ENDPOINT_URL@?query=describe<@IRI_SCHEME@://%{SERVER_NAME}@_IRI_PORT@%1>"

</Directory>
<Directory "/_">
#    Options Indexes FollowSymLinks
#    AllowOverride All
    Require all granted
    FallbackResource disabled
    RewriteEngine Off
</Directory>
ErrorDocument 404 /_/404.html
<Location /_/unauthorized>
    Require all denied
    ErrorDocument 403 /_/401.html
</Location>
<IfModule dir_module>
#    DirectoryIndex _/index.html
</IfModule>
<Files ".ht*">
    Require all denied
</Files>
ErrorLog /proc/self/fd/2
LogLevel warn
<IfModule log_config_module>
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    LogFormat "%h %l %u %t \"%r\" %>s %b" common
    <IfModule logio_module>
      LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %I %O" combinedio
    </IfModule>
    CustomLog /proc/self/fd/1 common
</IfModule>
<IfModule alias_module>
    Alias /_ "/_"
#    ScriptAlias /cgi-bin/ "/usr/local/apache2/cgi-bin/"
</IfModule>
<Directory "/usr/local/apache2/cgi-bin">
    AllowOverride None
    Options None
    Require all granted
</Directory>
<IfModule headers_module>
    RequestHeader unset Proxy early
</IfModule>
<IfModule mime_module>
    TypesConfig conf/mime.types
    AddType application/x-compress .Z
    AddType application/x-gzip .gz .tgz
</IfModule>
<IfModule proxy_html_module>
Include conf/extra/proxy-html.conf
</IfModule>
<IfModule ssl_module>
SSLRandomSeed startup builtin
SSLRandomSeed connect builtin
</IfModule>
