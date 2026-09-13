export const environment = {
  production: true,

  apiUrl: 'http://localhost:8080', // TODO: reemplazar cuando el API Gateway esté desplegado (ver issue #9)',

  azure: {
    tenantId: 'e4f9c581-8160-4c70-8316-b47f57cd4965',
    clientId: '853e11cd-e801-4317-96e7-bda1c6dd8d74',
    redirectUri: 'http://localhost:4200',
    scopes: ['api://a55c035c-76ef-4ddf-ab9a-545d90386f03/access_as_user']
  }
};