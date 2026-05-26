const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
    },
  });

  schema.pre(/^find/, function (next) {
    if (this.getOptions().includeDeleted) {
      return next();
    }
    this.where({ isDeleted: { $ne: true } });
    next();
  });

  schema.pre('countDocuments', function (next) {
    if (this.getOptions().includeDeleted) {
      return next();
    }
    this.where({ isDeleted: { $ne: true } });
    next();
  });

  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    return this.save();
  };
};

module.exports = softDeletePlugin;
