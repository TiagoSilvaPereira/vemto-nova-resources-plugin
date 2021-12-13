module.exports = (vemto) => {

    return {

        crudsAllowedForNova() {
            return vemto.project.getMainCruds()
        },

        beforeCodeGenerationEnd() {
            this.generateNovaFiles()
        },

        generateNovaFiles() {
            let basePath = 'app/Nova',
                options = {
                    formatAs: 'php',
                    data: {}
                }

            vemto.log.message('Generating Nova Resources...')

            this.crudsAllowedForNova().forEach(crud => {
                options.data = {
                    crud,
                    getTypeForNova: this.getTypeForNova,
                    getInputsForNova: this.getInputsForNova,
                    crudHasTextInputs: this.crudHasTextInputs,
                    getValidationForNova: this.getValidationForNova,
                    getUpdateValidationForNova: this.getUpdateValidationForNova,
                    getAllRelationshipsFromModel: this.getAllRelationshipsFromModel,
                    getRelationshipModelName: this.getRelationshipModelName
                }

                vemto.renderTemplate('files/NovaResource.vemtl', `${basePath}/${crud.model.name}.php`, options)
            })
        },

        getTypeForNova(input) {
            let textInputs = ['email', 'url']

            if(textInputs.includes(input.type)) {
                return 'Text'
            }
    
            if(input.isForRelationship()) {
                return 'BelongsTo'
            }
    
            if(input.type == 'checkbox') {
                return 'Boolean'
            }
    
            return input.type.case('pascalCase')
        },

        crudHasTextInputs(crud){
            return crud.hasTextInputs() || crud.hasEmailInputs() || crud.hasUrlInputs()
        },

        getValidationForNova(input) {
            let validation = input.convertValidationToTextForTemplate(input.validation)
            
            return validation.replace(/\|/g, '\', \'')
        },

        getUpdateValidationForNova(input) {
            let updateValidation = input.convertValidationToTextForTemplate(input.updateValidation)

            return updateValidation
                .replace(/\|/g, '\', \'')
                .replace(
                    `'unique:${input.crud.model.table},${input.name}'`,
                    `'unique:${input.crud.model.table},${input.name},{{resourceId}}'`)
        },

        getInputsForNova(crud) {
            return crud.inputs.filter(input => !input.isForRelationship())
        },

        getAllRelationshipsFromModel(model) {
            let basicRelationships = model.getAllRelationships(),
                morphRelationships = model.getAllMorphRelationships()

            return [].concat(
                basicRelationships, morphRelationships
            )
        },

        getRelationshipModelName(relationship) {
            let relWithPluralModelName = ['belongsToMany', 'morphMany', 'morphToMany', 'hasMany']

            if(relWithPluralModelName.includes(relationship.type)) {
                return relationship.model.plural
            }

            return relationship.model.name
        },

    }

}