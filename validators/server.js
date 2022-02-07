'use strict';
const joi = require('joi');
const validators = {
    constructor: joi.object(
        {
            port: joi.number().integer().min(7000).max(9999).required(),
            secret: joi.string().required(),
            locktimeout: joi.number().integer().required(),
            connection: joi.any().required()
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
                joi
                    .alternatives()
                    .try(
                        joi.number().integer().required(),
                        joi.string().required(),
                    )
                    .optional()
                    .allow(null)
            )

        }
    ),
    unlock: joi.string().required().max(100).min(1),
    log: joi.object(
        {
            sender: joi.string().required(),
            event: joi.string().required(),
            message: joi.string().required(),
            data: joi.any().optional().allow(null)
        }
    ),
    auth: joi.object(
        {
            name: joi.string().required().max(100).min(1),
            channel: joi.string().required().max(100).min(1),
            events: joi.array().items(joi.string().max(100).min(1)).optional(),
            http: joi.string().optional().allow(null).max(200).min(1),
            auth: joi.string().optional().allow(null).max(200).min(1),
            secret: joi.string().required().max(100).min(1)
        }
    )
};

module.exports = validators;