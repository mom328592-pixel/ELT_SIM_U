const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.3",

        info: {
            title: "SIM Registration & Management API",
            description: "API ສຳລັບຈັດການ SIM Registration",
            version: "1.0.0"
        },

        servers: [
            {
                url: "http://localhost:3000",
                description: "Local development server"
            }
        ],
        security: [
            {
                bearerAuth: []
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    apis: [
        "./routes/*.js"
    ],

    failOnErrors: true
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;