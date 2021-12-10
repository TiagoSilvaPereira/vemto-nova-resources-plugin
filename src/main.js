module.exports = (vemto) => {

    return {

        crudsAllowedForNova() {
            return vemto.project.getMainCruds()
        },

        generateNovaFiles() {
            let basePath = 'app/Nova',
                options = {
                    formatAs: 'php',
                    data: {}
                }

            vemto.log.message('Generating Nova Resources...')

            this.crudsAllowedForNova().forEach(crud => {
                options.data.crud = crud
                vemto.renderTemplate('files/NovaResource.vemtl', `${basePath}/${crud.model.name}.php`, options)
            })
        },

        beforeCodeGenerationEnd() {
            this.generateNovaFiles()
        }

    }

}