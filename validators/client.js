'use strict';
const joi = require('joi');
const validators = {
    constructor: joi.object(
        {
            channel: joi.string().required(),
            service: joi.string().required(),
            ip: joi.string().required(),
            port: joi.number().integer().min(7000).max(9999).required(),
            secret: joi.string().required(),
            http: joi.string().regex(/^(http|https)/i).optional().allow(null),
            auth: joi.string().regex(/^.*:.*$/i).optional().allow(null)
        }
    ),
    log: joi.object(
        {
            sender: joi.string().required(),
            event: joi.string().required(),
            message: joi.string().required(),
            data: joi.any().optional().allow(null)
        }
    ),

    publish: joi.object(
        {
            service: joi.string().required(),
            event: joi.string().required(),
            data: joi.any().required(),
            parent: joi.any().optional().allow(null),
            priority: joi.number().integer().max(1000).min(1).required(),
            delay: (
                joi.alternatives()
                    .try(
                        joi.number().integer().required(),
                        joi.string().required(),
                        joi.date().required()
                    )
                    .optional()
                    .allow(null)
            )
        }
    )

};

module.exports = validators;