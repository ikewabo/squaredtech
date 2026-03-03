# Use the official lightweight Nginx Alpine image
FROM nginx:alpine

# Copy the static website files into the default Nginx document root
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY script.js /usr/share/nginx/html/script.js

# Copy the assets folder (images, video frames, etc.)
COPY assets/ /usr/share/nginx/html/assets/

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Configure Nginx to listen on port 8080 instead of 80
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
