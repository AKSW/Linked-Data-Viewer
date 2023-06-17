FROM httpd:2.4

COPY ./my-httpd.conf.tpl /usr/local/apache2/conf/httpd.conf.tpl
RUN rm -f /usr/local/apache2/conf/httpd.conf
RUN rm -rf /usr/local/apache2/htdocs
ADD ./_ /usr/local/apache2/htdocs/_
RUN rm -rf /usr/local/apache2/htdocs/_/js2/config.js
RUN chmod -R go+rX /usr/local/apache2/htdocs/_
COPY ./docker-start.sh /
CMD ["/docker-start.sh"]
