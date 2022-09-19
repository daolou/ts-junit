import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import * as ts from 'typescript'
import { FileReference } from 'typescript'

// const fileInfo = ts.preProcessFile(readFileSync('./tests/test.ts').toString())['importedFiles']
// console.dir(fileInfo)
// const result = fileInfo.map(el => {return el.fileName});
// console.dir(result)

export const libFiles = new Set()
export const localFiles = new Set<string>()

export const processedFiles = new Set()

export const needCompileFiles = new Array()

function getImportsForFile(file: string, options?: any) {
    console.dir(file)
    const fileInfo = ts.preProcessFile(readFileSync(file).toString())
    if (options&&options.verbose)
        console.log('getImportsForFile ' + file + ': ' + fileInfo.importedFiles.map((el) => el.fileName).join(', '))
    return fileInfo.importedFiles
        .map((importedFile: FileReference) => importedFile.fileName)
        .flatMap((fileName: string) => {
            // console.dir(fileName)
            if (!fileName.startsWith('.')) {
                libFiles.add(fileName)
            }
            
            return fileName
            // flat map is not ideal here, because we could hit multiple valid imports, and not the first aka best one
            //return applyPathMapping(fileName, path_mapping) 
        })
        .filter((x: string) => x.startsWith('.')) // only relative paths allowed
        .flatMap((fileName: string) => {
            return [fileName, join(dirname(file), fileName)]
        })
        .map((fileName: string) => {
            if (existsSync(`${fileName}.ts`)) {
                localFiles.add( `${fileName}.ts`)
            }
            if (existsSync(`${fileName}.tsx`)) {
                return `${fileName}.tsx`
            }
            const yo = join(fileName, 'index.ts').normalize()
            if (existsSync(yo)) {
                
                localFiles.add(yo)
            }
            const tsx_subfolder = join(fileName, 'index.tsx').normalize()
            if (existsSync(tsx_subfolder)) {
                return tsx_subfolder
            }
            if (fileName.endsWith('.js')) {
                const tsFromJs = fileName.replace(/[.]js$/, '.ts')
                if (existsSync(tsFromJs)) {
                    return tsFromJs
                }
            }
            // ignoredFiles.add(fileName)
            // return undefined
            // throw new Error(`Unresolved import ${fileName} in ${file}`);
        })
        // .filter(isDefined)
        // .map(convertPath)
}

export function getAllImportsForFile(file:string){

    processedFiles.add(file)
    needCompileFiles.push(file)
    getImportsForFile(file,{verbose:true})
    let count: number = 0 
    localFiles.forEach((i)=>{
        count++;
        // 



        if (!processedFiles.has(i) &&count> 0) {
            // processedFiles.add(i)
            getAllImportsForFile(i)
        }
    })
}

export function getNeedCompileFiles(){
    const arr = needCompileFiles.reverse()
    return arr.filter((item, index) => arr.indexOf(item) === index);   
}

export function getDependencyImports (files){
    const alibFiles = new Set()
    const alocalFiles = new Set()
    files.map((a:string) => {
        getImportsForFile(a)
    
        libFiles.forEach(alibFiles.add, alibFiles)
        localFiles.forEach(alibFiles.add, alocalFiles)
    })

    return {
        'lib':alibFiles,
        'local': alocalFiles
    }
}

// example
// const a = getDependencyImports(['./tests/test.ts','./tests/a/test2.ts'])
// console.dir(a)