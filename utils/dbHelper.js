const sequelize = require('sequelize');
const { Op } = require('sequelize');

function datatableOptions(args, searchColumns = [], searchMoreColumns = []) {
    let order = [];
    if (args.sort && args.sort.length) {
        args.sort.forEach(element => {
            order.push([element.selector, (element.desc == true ? 'DESC' : 'ASC')]);
        });
    }
    let filters = [];
    if (args.filter && args.filter.length) {
        args.filter = Array.isArray(args.filter) ? args.filter : args.filter;
        for (const filter of args.filter) {
            if (filter.compare == '=') {
                filters.push({ [filter.filter]: filter.filter_id })
            } else {
                filters.push({ [filter.filter]: { [Op.like]: filter.filter_id } })
            }
        }
    }
    if (args.search && searchColumns && searchColumns.length > 0) {
        let whereLikes = [];
        for (let column of searchColumns) {
            if (!['createdAt', 'updatedAt'].includes(column)) {
                whereLikes.push({ [column]: { [Op.like]: '%' + args.search + '%' } })
            }
        }
        if (searchMoreColumns.length) {
            for (let column of searchMoreColumns) {
                whereLikes.push({ [column]: { [Op.like]: '%' + args.search + '%' } })
            }
        }
        if (whereLikes.length > 0) {
            filters.push({ [Op.or]: whereLikes })
        }
    }
    let limit = args.limit ? Number(args.limit) : 10;
    let offset = args.offset ? Number(args.offset) : 0;
    return { order: order, limit: limit, offset: offset, where: filters };
}

function getSearchColumns(attributes) {
    let searchColumns = [];
    for (let [key, opt] of Object.entries(attributes)) {
        if (opt.type && opt.type.key != 'DATE') {
            searchColumns.push(key);
        }
    }
    return searchColumns;
}

module.exports = {
    getSearchColumns,
    datatableOptions
}