# Fabricate

### Docker

For manually building and publishing:

```bash
docker build . -t flawiddsouza/fabricate:0.1.0 -t flawiddsouza/fabricate:latest
docker push flawiddsouza/fabricate:0.1.0
docker push flawiddsouza/fabricate:latest
```

Running:

```bash
docker run -p 9333:9333 flawiddsouza/fabricate:latest
```
