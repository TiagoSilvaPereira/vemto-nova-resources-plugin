# Laravel Nova Resources

> This is a [Vemto](https://vemto.app) plugin. Vemto is a GUI [Laravel](https://laravel.com) generator with a complete set of tools for starting new [Laravel](https://laravel.com) projects. 

This plugin aims to bring the generation of [Laravel Nova Resources](https://nova.laravel.com/docs/3.0/resources/) to your Vemto Laravel project.

## Requirements

This plugin doesn't install [Laravel Nova](https://nova.laravel.com/), as it is a paid package. Before using it, please be sure to follow all [Laravel Nova installation steps](https://nova.laravel.com/docs/3.0/installation.html) on your generated project.

After installing [Laravel Nova](https://nova.laravel.com/), you can just select what resources you want to generate based on your project CRUD applications.

> **Note:** it is necessary to create CRUD applications for the models you want to generate Resources that will appear in the Admin Panel sidebar (it is not necessary to create CRUD applications for Relationships Resources, but you can if you want... in the lack of a CRUD for the relationship model, the plugin will generate a Resource based on the model data)

## How it works?

Within the configuration page, you only need to select the main CRUDs that will be generated as a *Laravel Nova Resource* (those that will appear in the sidebar).

For each main CRUD, you can select to generate:

- Inputs (will generate the form inputs as Laravel Nova inputs, including *BelongsTo* selects)
- Relationships (will generate the *HasMany* and *BelongsToMany* relationships)