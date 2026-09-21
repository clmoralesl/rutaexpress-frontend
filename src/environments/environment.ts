export const environment = {
  production: false,

  apiUrl: 'https://7fq86ku2j4.execute-api.us-east-1.amazonaws.com', // API Gateway en EKS

  azure: {
    tenantId: 'e4f9c581-8160-4c70-8316-b47f57cd4965',
    clientId: '853e11cd-e801-4317-96e7-bda1c6dd8d74',
    redirectUri: 'http://localhost:4200',
    scopes: ['api://a55c035c-76ef-4ddf-ab9a-545d90386f03/access_as_user']
  }
};