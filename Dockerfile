FROM httpd:latest

#COPY ./client/dist/* /usr/share/nginx/html
COPY ./client/dist/ /usr/local/apache2/htdocs/
