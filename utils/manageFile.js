const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function checkFolder(folder) {
  try {
    if (!fs.existsSync('./' + folder)) {
      fs.mkdirSync('./' + folder, { recursive: true });
      fs.access('./' + folder, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        if (err) {
          throw new Error(err);
        }
      });
    }
    return {
      success: true,
      data: folder
    }
  } catch (error) {
    return {
      success: false,
      message: error.message ?? error
    }
  }
}
async function saveImage(data, folder, filename) {
  try {
    const checkFolder = this.checkFolder(folder);
    if (!checkFolder.success) {
      throw new Error(checkFolder.message);
    }
    const filepath = `${folder}/${filename}`;
    const _currentFilepath = this.currentFilepath('./' + filepath)
    try {
      await sharp(data).resize(350, 350, { // size image 350x350
        fit: sharp.fit.inside,
        withoutEnlargement: true
      }).toFile(_currentFilepath);
    } catch (error) {
      await fs.writeFileSync(_currentFilepath, data)
    }
    return {
      success: true,
      data: filepath
    }
    
  } catch (error) {
    return {
      success: false,
      message: error.message ?? error
    }
  }
}

function currentFilepath(filepath) {
  return path.resolve(filepath)
}

function setFullFilePath(req, filepath) {
  return req.protocol + '://' + req.get('host') + '/api/file/' + filepath;
}

function getFile(filepath) {
  try {
    if (filepath && fs.existsSync(filepath)) {
      return {
        success: true,
        data: path.resolve(filepath)
      }
    }
    throw new Error("File not found");
  } catch (error) {
    return {
      success: false,
      message: error.message ?? error
    }
  }
}
module.exports = {
  checkFolder,
  saveImage,
  currentFilepath,
  getFile,
  setFullFilePath
};