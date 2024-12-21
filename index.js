const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

class FileHandler {
  #filePath;

  constructor(filePath) {
    this.#validatePath(filePath);
    this.#filePath = filePath;
  }

  #validatePath(filePath) {
    this.#checkFilePathExists(filePath);
    this.#isString(filePath);
    const normalizedPath = this.#normalizePath(filePath);
    this.#checkPathTraversal(normalizedPath);
    this.#checkInvalidCharacters(filePath);
  }

  #checkFilePathExists(filePath) {
    if (!filePath) {
      throw new Error("File path is required");
    }
  }

  #isString(filePath) {
    if (typeof filePath !== "string") {
      throw new Error("File path must be a string");
    }
  }

  #normalizePath(filePath) {
    return path.normalize(filePath);
  }

  #checkPathTraversal(normalizedPath) {
    if (normalizedPath.includes("..")) {
      throw new Error("File path cannot contain relative path traversal");
    }
  }

  #checkInvalidCharacters(filePath) {
    const invalidChars = /[<>:"\|?*]/g;
    if (invalidChars.test(filePath)) {
      throw new Error("File path contains invalid characters");
    }
  }

  getFileCreationTime() {
    return new Promise((resolve, reject) => {
      fs.stat(this.#filePath, (err, stats) => {
        if (err) {
          reject(`Error fetching file stats: ${err}`);
          return;
        }
        resolve(stats.birthtime);
      });
    });
  }

  getFileExtension() {
    return new Promise((resolve, reject) => {
      fs.access(this.#filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(`File not found: ${this.#filePath}`);
          return;
        }

        const extension = path.extname(this.#filePath);
        if (extension) {
          resolve(extension);
        } else {
          reject("No file extension found");
        }
      });
    });
  }

  getFileName() {
    return new Promise((resolve, reject) => {
      fs.access(this.#filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(`File not found: ${this.#filePath}`);
          return;
        }

        const fileName = path.basename(this.#filePath);
        if (fileName) {
          resolve(fileName);
        } else {
          reject("No file name found");
        }
      });
    });
  }

  getFileSize(unit = "bytes") {
    return new Promise((resolve, reject) => {
      // Check if unit is a string
      if (typeof unit !== "string" || unit.length === 0 || unit.trim() === "" || unit === null || unit === undefined) { 
        resolve(
          "Please provide a valid unit. Use bit, byte, kilobyte, megabyte, or gigabyte."
        );
        return;
      }

      fs.access(this.#filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(`File not found: ${this.#filePath}`);
          return;
        }

        fs.stat(this.#filePath, (err, stats) => {
          if (err) {
            reject(`Unable to get file stats: ${this.#filePath}`);
            return;
          }

          if (stats && stats.size) {
            let sizeInBytes = stats.size;

            // Convert the size based on the requested unit
            let convertedSize;
            switch (unit.toLowerCase()) {
              case "bit":
              case "bits":
                convertedSize = sizeInBytes * 8; // 1 byte = 8 bits
                break;
              case "byte":
              case "bytes":
                convertedSize = sizeInBytes; // Already in bytes
                break;
              case "kilobyte":
              case "kilobytes":
                convertedSize = sizeInBytes / 1024; // 1 KB = 1024 bytes
                break;
              case "megabyte":
              case "megabytes":
                convertedSize = sizeInBytes / (1024 * 1024); // 1 MB = 1024 * 1024 bytes
                break;
              case "gigabyte":
              case "gigabytes":
                convertedSize = sizeInBytes / (1024 * 1024 * 1024); // 1 GB = 1024 * 1024 * 1024 bytes
                break;
              default:
                resolve(
                  "Unsupported unit. Please use bit, byte, kilobyte, megabyte, or gigabyte."
                );
                return;
            }

            resolve(convertedSize + " " + unit);
          } else {
            resolve("Unable to retrieve file size");
          }
        });
      });
    });
  }

  getLastModifiedDate() {
    return new Promise((resolve, reject) => {
      fs.access(this.#filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(`File not found: ${this.#filePath}`);
          return;
        }

        fs.stat(this.#filePath, (err, stats) => {
          if (err) {
            reject(`Unable to get file stats: ${this.#filePath}`);
            return;
          }

          if (stats && stats.mtime) {
            resolve(stats.mtime); // Last modified date of the file
          } else {
            reject("Unable to retrieve last modified date");
          }
        });
      });
    });
  }

  #getFileAgeInDaysHoursMinutes(fileCreationTime) {
    const currentTime = new Date();
    const timeDifference = currentTime - new Date(fileCreationTime);

    const days = Math.floor(timeDifference / (1000 * 3600 * 24));
    const hours = Math.floor(
      (timeDifference % (1000 * 3600 * 24)) / (1000 * 3600)
    );
    const minutes = Math.floor((timeDifference % (1000 * 3600)) / (1000 * 60));

    return {
      days,
      hours,
      minutes,
    };
  }

  async getFileAge() {
    try {
      await fs.promises.access(this.#filePath, fs.constants.F_OK);
      const fileCreationTime = await this.getFileCreationTime();
      return this.#getFileAgeInDaysHoursMinutes(fileCreationTime);
    } catch (error) {
      throw new Error(`Error getting file age: ${error.message}`);
    }
  }

  computeChecksum() {
    return new Promise((resolve, reject) => {
      fs.access(this.#filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(`File not found: ${this.#filePath}`);
          return;
        }

        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(this.#filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", (err) =>
          reject(`Error reading file: ${err.message}`)
        );
      });
    });
  }
}

// Example usage
async function example() {
  try {
    const filePath =
      "/Users/saanvilakhanpal/Desktop/Recursion-in-js/file-metadata-extractor/yo.txt";
    const fileHandler = new FileHandler(filePath);

    // // Get file age
    // const age =  await fileHandler.getFileAge();
    // console.log('File age:', age);

    // // Compute checksum
    // const checksum = await fileHandler.computeChecksum();
    // console.log('File checksum:', checksum);

    // // Get file extension
    // const extension = await fileHandler.getFileExtension();
    // console.log('File extension:', extension);

    // Get file name
    const fileName = await fileHandler.getFileName();
    console.log('File name:', fileName);

    // Get file size
    const fileSize = await fileHandler.getFileSize(false);
    console.log('File size:', fileSize);

    // // Get last modified date
    const lastModifiedDate = await fileHandler.getLastModifiedDate();
    console.log('Last modified date:', lastModifiedDate);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
example();

module.exports = FileHandler;
