FROM node:10-alpine
WORKDIR /opt/mre

COPY microsoft-mixed-reality-extension-sdk-0.18.1.tgz ./
COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tsconfig.json ./
COPY src ./src/
RUN ["npm", "run", "build"]

COPY public ./public/

EXPOSE 3901/tcp
CMD ["npm", "start"]