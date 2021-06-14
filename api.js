const Sq = require("sequelize");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const Cryptr = require('cryptr');
const cryptr = new Cryptr('SankirtanKey');
var moment = require("moment");

const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const {
  Group,
  GroupMember,
  Item,
  Period,
  People,
  Organization,
  Group_1,
  Setting,
  AccessPermission
} = require("./models/common");
const {
  BusinessPlanSummary,
  Transaction,
  TransactionLineItem,
  TransactionPeople,
  RollupReports,
  UploadBatch,
  GoalDescription
} = require("./models/transaction");
const { start } = require("repl");
const { getDatumPath } = require("node-persist");
const { AccessDeniedError } = require("sequelize");
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const APP_URL = "http://localhost:8080/";
const NEWSLETTER_BOOK_TYPES = [
  "mbig",
  "big",
  "full",
  "large",
  "medium",
  "small",
  "btg",
  "magazines",
];
const SANKIRTAN_GROUP_TYPE = [
  "Corporate",
  "Door to Door",
  "Kids",
  "Kirtan",
  "Motel",
  "Other",
  "Weekend Warriors",
  "Congregational Preaching",
  "Shastra Dana",
];
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const split_mime = file.mimetype.split("/");
    const extension =getArrOfBookTypeTotal
  },
});

const imageFilter = function (req, file, cb) {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};



router.get("/validate-host1", async function (req, res) {
  // console.log(req.session);
  if (
    typeof req.session.loggedUser !== "undefined" &&
    req.session.hostname !== "undefined"
  ) {
    const useremail = req.session.loggedUser;
    const hostname = req.session.hostname;
    const headerData = JSON.parse(req.session.headerData);
    const settings = await Setting.findAll();
    const settingsFormatted = {};
    settings.map((setting) => {
      settingsFormatted[setting.key] = setting.value;
    });
    Organization.findOne({
      attributes: [
        "id",
        "name",
        "source_website_url_primary",
        "target_elvanto_url_primary",
        "new_people_default_groups",
        "new_people_default_type",
        "elvanto_api_key",
        "google_maps_api_key",
        "created_date",
        "last_modified_date",
        "category_lead_id",
        "distribution_list_email",
        "email_book_distribution_entry",
      ],
      where: {
        target_elvanto_url_primary: hostname,
      },
    })
      .then((org) => {
        if (org) {
          People.findOne({
            attributes: ["id", "firstname", "lastname", "organization_id", "role"],
            where: {
              email: useremail,
              organization_id: org.id,
            },
          })
            .then((user) => {
              if (user) {
                AccessPermission.findAll({
                  attributes: ["screen", "create", "read", "edit", "delete", "data_access"],
                  where: {
                    roles: user.role
                  },
                })
                .then((array) => {
                  if(array)
                  {
                  res.status(200).send({
                    organization: org,
                    user: user,
                    settings: settingsFormatted,
                    headerData: headerData,
                    permissions : commonPermissionsObject(array),
                      });
                  }
                })
                .catch((err) => {
                  console.log('error', err)
                });
              } else {
                res.status(404).send({ success: 0 });
              }
            })
            .catch((err) => {
              res.send({ error: err.original });
            });
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  } else {
    res.send({ success: 0 });
  }
});
// Validate HostName When a User Trying to Login and get back Org details
router.post("/validate-host", async function (req, res) {
  const settings = await Setting.findAll();
  const settingsFormatted = {};
  settings.map((setting) => {
    settingsFormatted[setting.key] = setting.value;
  });
  
  Organization.findOne({
    attributes: [
      "id",
      "name",
      "source_website_url_primary",
      "target_elvanto_url_primary",
      "new_people_default_groups",
      "new_people_default_type",
      "elvanto_api_key",
      "google_maps_api_key",
      "created_date",
      "last_modified_date",
      "category_lead_id",
      "distribution_list_email",
      "email_book_distribution_entry"
    ],
    where: {
      target_elvanto_url_primary: req.body.hostname,
    },
  })
    .then((org) => {
     // console.log('org', org)
      if (org) {
        People.findOne({
          attributes: ["id", "firstname", "lastname", "organization_id", "role"],
          where: {
            email: req.body.email,
            organization_id: org.id,
          },
        })
          .then((user) => {
           // console.log('user is', user)
            if (user) {
                AccessPermission.findAll({
                  attributes: ["screen", "create", "read", "edit", "delete", "data_access"],
                  where: {
                    roles: user.role
                  },
                })
                .then((array) => {
                  if(array)
                  {
                  res.status(200).send({
                    organization: org,
                    user: user,
                    settings: settingsFormatted,
                    permissions : commonPermissionsObject(array),
                      });
                  }
          //   console.log('reeesss', commonPermissionsObject(array))
   
                })
                .catch((err) => {
                  console.log('error', err)
                });
              
             
              
            } else {
              res.status(404).send({ exist: 0 });
            }
          })
          .catch((err) => {
            res.send({ error: err.original });
          });



      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});



router.get("/organization", function (req, res) {
  let { page, limit, sort, order, search } = req.query;
  if (page && limit) {
    Organization.findAndCountAll()
      .then((total) => {
       // console.log(Organization);
        let _where = {};
        if (search !== "null") {
          page = 1;
          _where = {
            where: {
              [Sq.Op.or]: {
                name: { [Sq.Op.iLike]: `%${search}%` },
                source_website_url_primary: { [Sq.Op.iLike]: `%${search}%` },
                target_elvanto_url_primary: { [Sq.Op.iLike]: `%${search}%` },
                elvanto_api_key: { [Sq.Op.iLike]: `%${search}%` },
                new_people_default_groups: { [Sq.Op.iLike]: `%${search}%` },
              },
            },
          };
        }
        Organization.findAll({
          ..._where,
          order: [[sort, order]],
          offset: (page - 1) * limit,
          limit,
        })
          .then((result) => {
            if (search === "null") {
              res.status(200).send({ count: total.count, rows: result });
            } else {
              res.status(200).send({ count: result.length, rows: result });
            }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  } else {
    Organization.findAll()
      .then((result) => {
        res.status(200).send(result);
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  }
});

// Get the list of Items
router.get("/items", function (req, res) {
  const { page, limit, sort, order, search } = req.query;
  if (page && limit) {
    Item.findAndCountAll({where: {
      status : 1
    }})
      .then((total) => {
        console.log('total', total)
        let _where = {where : {status : 1}};
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: [
                { name: { [Sq.Op.iLike]: `%${search}%` } },
                Sq.where(Sq.cast(Sq.col("item.book_type"), "varchar"), {
                  [Sq.Op.iLike]: `%${search}%`,
                }),
                Sq.where(Sq.cast(Sq.col("item.description"), "varchar"), {
                  [Sq.Op.iLike]: `%${search}%`,
                }),
              ],
            },
          };
        }

        Item.findAll({
          ..._where,
        })
          .then((result) => {
            if (sort) {
              result = result.sort(dynamicSort(sort, order));
            }
            let offset = (page - 1) * limit;
            let retresult = result.slice(
              offset,
              Math.min(result.length, Number(offset) + Number(limit))
            );
            if (search == "null") {
              res.status(200).send({ count: total.count, rows: retresult });
            } else {
              res.status(200).send({ count: result.length, rows: retresult });
            }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  } else {
    Item.findAll()
      .then((items) => {
        if (items) {
          res.status(200).send(items);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  }
});

// Get the last-rollup
router.get("/last-rollup", function (req, res) {
  RollupReports.findAll({
    order: [["rollup_id", "DESC"]],
    limit: 1,
  }).then(function (result) {
    res.status(200).send({ result: result });
  });
});

// Get the list of Rollup-reports
router.get("/rollup-reports", function (req, res) {
  const { page, limit, sort, order, search } = req.query;
  if (page && limit) {
    RollupReports.findAndCountAll()
      .then((total) => {
        let _where = {};
        _where = { where: { updated_count: { [Sq.Op.not]: 0 } } };
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: [
                Sq.where(
                  Sq.cast(
                    Sq.col("transaction_rollup_reports.updated_count"),
                    "varchar"
                  ),
                  { [Sq.Op.iLike]: `%${search}%` }
                ),
                Sq.where(
                  Sq.cast(
                    Sq.col("transaction_rollup_reports.success_count"),
                    "varchar"
                  ),
                  { [Sq.Op.iLike]: `%${search}%` }
                ),
                Sq.where(
                  Sq.cast(
                    Sq.col("transaction_rollup_reports.failed_count"),
                    "varchar"
                  ),
                  { [Sq.Op.iLike]: `%${search}%` }
                ),
                Sq.where(
                  Sq.cast(
                    Sq.col("transaction_rollup_reports.start_time"),
                    "varchar"
                  ),
                  { [Sq.Op.iLike]: `%${search}%` }
                ),
                Sq.where(
                  Sq.cast(
                    Sq.col("transaction_rollup_reports.end_time"),
                    "varchar"
                  ),
                  { [Sq.Op.iLike]: `%${search}%` }
                ),
              ],
            },
          };
        }

        RollupReports.findAll({
          ..._where,
          order: [[sort, order]],
          offset: (page - 1) * limit,
          limit,
        })
          .then((result) => {
            if (search == "null") {
              res.status(200).send({ count: total.count, rows: result });
            } else {
              res.status(200).send({ count: result.length, rows: result });
            }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  } else {
    RollupReports.findAll()
      .then((items) => {
        if (items) {
          res.status(200).send(items);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  }
});

// Get the list of Items
router.get("/items/:id", function (req, res) {
  const { id } = req.params;
  Item.findOne({ where: { id: id } })
    .then((item) => {
      if (item) {
        res.status(200).send(item);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

// Add new list Item
router.post("/items", function (req, res) {
  const upload =  multer({ storage: storage, fileFilter: imageFilter }).single(
    "cover"
  );
  upload(req, res, function (err) {
    if (err) {
      console.log("Error:", err);
    }
    let itemData = JSON.parse(req.body.formFields);
    const userId = JSON.parse(req.body.userId);
    itemData = {
      ...itemData,
      created_by_id: userId,
      last_modified_by_id: userId,
    };
    if (typeof req.file !== "undefined") {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
      itemData = { ...itemData, cover: req.file.path };
    }
    Item.create(itemData)
      .then((result) => {
        if (result) {
          res.status(200).send(result);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  });
});

// Add new list Item
router.patch("/items/:id", function (req, res) {
  const { id } = req.params;
  const upload = multer({ storage: storage, fileFilter: imageFilter }).single(
    "cover"
  );
  upload(req, res, function (err) {
    if (err) {
      console.log("Error:", err);
    }
    let itemData = JSON.parse(req.body.formFields);
    const userId = JSON.parse(req.body.userId);
    itemData = {
      ...itemData,
      last_modified_by_id: userId,
    };
    if (typeof req.file !== "undefined") {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
      itemData = { ...itemData, cover: req.file.path };
    }
    Item.update(itemData, { where: { id: id } })
      .then((result) => {
        if (result) {
          res.status(200).send(result);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  });
});


router.delete("/items/:id", function (req, res) {
  const { id } = req.params;
  let item = {
    status : 0,
  };
  Item.update(item, { where: { id: id } })
    .then((result) => {
     // console.log('sress', result)
      if (result) {
        res.status(200).send({ message: "Book deleted successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });

});
/**
 * Manage Period Here
 */
router.get("/periods", function (req, res) {
  const { page, limit, sort, order, search } = req.query;
  //const _where = typeof type !== 'undefined' ? { type: type } : {};
  let _where = { where: {is_active : 1}};
  if (page && limit) {
    Period.findAndCountAll().then((total) => {
      if (search !== "null") {
        _where = {
          where: {
            is_active : 1,
            [Sq.Op.or]: [
              {
                name: { [Sq.Op.iLike]: `%${search}%` },
              },
              Sq.where(Sq.cast(Sq.col("period.type"), "varchar"), {
                [Sq.Op.iLike]: `%${search}%`,
              }),
              Sq.where(Sq.cast(Sq.col("period.start"), "varchar"), {
                [Sq.Op.iLike]: `%${search}%`,
              }),
              Sq.where(Sq.cast(Sq.col("period.end"), "varchar"), {
                [Sq.Op.iLike]: `%${search}%`,
              }),
            ],
          },
        };
      }
      // console.log('m here')
      Period.findAll({
        ..._where,
        order: [[sort, order]],
        offset: (page - 1) * limit,
        limit,
      })
        .then((periods) => {
          if (search === "null") {
            res.status(200).send({ count: total.count, rows: periods });
          } else {
            res.status(200).send({ count: periods.length, rows: periods });
          }
        })
        .catch((err) => {
          res.send({ error: err.original });
        });
    });
    
  } else {
    console.log('m there')
    Period.findAll({ where: _where, order: ["type", "number"] })
      .then((periods) => {
        if (periods) {
          res.status(200).send(periods);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  }
});

router.get("/periods/:id", function (req, res) {
  const { id } = req.params;
  Period.findOne({ where: { id: id, is_active : 1 } })
    .then((periods) => {
      if (periods) {
        res.status(200).send(periods);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

router.post("/periods", async function (req, res) {
 const start_date = new Date(req.body.start);
 let result = await findPeriod(req);
  let period = {
    is_active : 1,
    ...req.body,
    year: start_date.getFullYear(),
  }; 
  if(!result){
    Period.create(period)
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      console.log('err is', err)
      res.status(503).send({ error: err.original });
    });
  }
  else {
    res.status(420).send({ error: 'Periods Dates Overlapping' });
  }
  
  
});

// checking if period exists 
// checking if period exists 
const findPeriod = async (req) =>  {
  let isExist = false
  let MSFPeriods = []
  let MonthPeriods = []
  let periods = await Period.findAll({ where: { is_active: 1 } })
  for(msf in periods) {
    if(periods[msf].dataValues.type == 'MSF'){
      MSFPeriods.push(periods[msf])
    }
    else {
      MonthPeriods.push(periods[msf])
    }
  }
 if(req.body.type == 'Month') {
 for(period in MonthPeriods)
 { 
 var startDate = moment(req.body.start).format('YYYY-MM-DD');
 var endDate = moment(req.body.end).format('YYYY-MM-DD');
   if(startDate >= MonthPeriods[period].dataValues.start && MonthPeriods[period].dataValues.end >= startDate){
    isExist = true
   }
    else if(endDate >= MonthPeriods[period].dataValues.start && MonthPeriods[period].dataValues.end >= endDate){
      isExist = true   
    }
 }
}
 else {
  for(period in MSFPeriods)
  { 
  var startDate = moment(req.body.start).format('YYYY-MM-DD');
  var endDate = moment(req.body.end).format('YYYY-MM-DD');
    if(startDate >= MSFPeriods[period].dataValues.start && MSFPeriods[period].dataValues.end >= startDate){
     isExist = true
    }
     else if(endDate >= MSFPeriods[period].dataValues.start && MSFPeriods[period].dataValues.end >= endDate){
       isExist = true   
     }
  }
 }
 return isExist
}

router.patch("/periods/:id", async function (req, res) {
  const { id } = req.params;
  const start_date = new Date(req.body.start);
  let period = {
    ...req.body,
    // number: start_date.getMonth(),
    year: start_date.getFullYear(),
  };
  Period.update(period, { where: { id: id } })
    .then((result) => {
      if (result) {
        res.status(200).send({ message: "Period updated successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.delete("/periods/:id", function (req, res) {
  // console.log('res', req.params);
  const { id } = req.params;
  let item = {
    is_active : 0,
  };
  Period.update(item, { where: { id: id } })
    .then((result) => {
     // console.log('sress', result)
      if (result) {
        res.status(200).send({ message: "Period deleted successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
  // const { id } = req.params;
  // Period.destroy({ where: { id: id } })
  //   .then((result) => {
  //     res.status(200).send({ message: "Period deleted successfully!" });
  //   })
  //   .catch((err) => {
  //     res.send({ error: err.original });
  //   });
});

router.get("/open-period-interval", function (req, res) {
  Period.findAll({
    where: { status: "Open", is_active : 1 },
    attributes: [
      [Sq.fn("min", Sq.col("start")), "minDate"],
      [Sq.fn("max", Sq.col("end")), "maxDate"],
    ],
  })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

/**
 * Manage Organization Here
 */
router.get("/organization", function (req, res) {
  let { page, limit, sort, order, search } = req.query;
  if (page && limit) {
    Organization.findAndCountAll()
      .then((total) => {
        let _where = {};
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: {
                name: { [Sq.Op.iLike]: `%${search}%` },
                source_website_url_primary: { [Sq.Op.iLike]: `%${search}%` },
                target_elvanto_url_primary: { [Sq.Op.iLike]: `%${search}%` },
                elvanto_api_key: { [Sq.Op.iLike]: `%${search}%` },
                new_people_default_groups: { [Sq.Op.iLike]: `%${search}%` },
              },
            },
          };
        }
        Organization.findAll({
          ..._where,
          order: [[sort, order]],
          offset: (page - 1) * limit,
          limit,
        })
          .then((result) => {
            if (search == "null") {
              res.status(200).send({ count: total.count, rows: result });
            } else {
              res.status(200).send({ count: result.length, rows: result });
            }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  } else {
    Organization.findAll()
      .then((result) => {
        res.status(200).send(result);
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  }
});

router.get("/organization/:id", function (req, res) {
  const { id } = req.params;
  Organization.findOne({ where: { id: id } })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.delete("/organization/:id", function (req, res) {
  const { id } = req.params;
  Organization.destroy({ where: { id: id } })
    .then((result) => {
      res.status(200).send({ message: "Organization deleted successfully!" });
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.post("/organization", function (req, res) {
  Organization.create(req.body)
    .then((result) => {
      if (result) {
        res.status(200).send({ message: "Organization added successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.patch("/organization/:id", function (req, res) {
  const { id } = req.params;
  Organization.update(req.body, { where: { id: id } })
    .then((result) => {
      res.status(200).send({ message: "Organization updated successfully!" });
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

/**
 * Manage Peoples
 */
router.post("/people", function (req, res) {
  People.create(req.body)
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.get("/people", function (req, res) {
  const { page, limit, search, sort, order } = req.query;
  if (page && limit) {
    People.findAndCountAll()
      .then((total) => {
        let _where = {};
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: [
                { firstname: { [Sq.Op.iLike]: `%${search}%` } },
                { lastname: { [Sq.Op.iLike]: `%${search}%` } },
                { phone: { [Sq.Op.iLike]: `%${search}%` } },
                { home_address: { [Sq.Op.iLike]: `%${search}%` } },
                { home_city: { [Sq.Op.iLike]: `%${search}%` } },
                { home_state: { [Sq.Op.iLike]: `%${search}%` } },
              ],
            },
          };
        }

        People.findAll({
          ..._where,
          order: [[sort, order]],
          offset: (page - 1) * limit,
          limit,
        })
          .then((result) => {
            if (search === "null") {
              res.status(200).send({ count: total.count, rows: result });
            } else {
              res.status(200).send({ count: result.length, rows: result });
            }
          })
          .catch((err) => {
            res.send({ error: err.original });
          });
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  } else {
    People.findAll()
      .then((result) => {
        res.status(200).send(result);
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  }
});

router.get("/people/:id", function (req, res) {
 // console.log('i m in people')
  const { id } = req.params;
  People.findOne({ where: { id: id } })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

router.patch("/people/:id", async function (req, res) {
  const { id } = req.params;
  console.log('ree', req.body)
  let item = {
    role : req.body.role,
    harinama_initiation_spiritual_master_name : req.body.initiation
  };
  // change setting id for local
  People.update(item, { where: { id: id } })
      .then(async (result) => {
        if (result) {
            res.status(200).send({message: "Data updated successfully!"});
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
      let ids = [42];
      if(req.body.role == "Members" || req.body.role == "Group Leaders"){
       ids.push(30)
      }
      // if(req.body.initiation != "Bhaktivedānta Svāmī Prabhupāda"){
      //   ids.push(15)
      //  }
       
        for(let i in ids)
      {
        let selected =  await Setting.findOne({
          where: { id : ids[i] }
         })
         let arr = selected['dataValues'].value.split(",");
       if(arr.length !== 0)
       {
       // console.log('selectedId',id)
        var index = arr.indexOf(id);
       // console.log('index is222', index)
        if(index != -1)
        {
        arr.splice(index, 1);
        }
        if(ids[i] == 42 && req.body.initiation == "Bhaktivedānta Svāmī Prabhupāda"){
          arr.push(id)
        }
       let setting = {
         value : arr.toString()
       }
       Setting.update(setting, { where: { id : ids[i] } })
       .then((result) => {
         console.log('result is', result)
         if (result) {
           //res.status(200).send({message: "Data updated successfully!"});
         } else {
          // res.status(404).send({ success: 0 });
         }
       })
       .catch((err) => {
         console.log('error')
         res.status(503).send({ error: err.original });
       });
      
      }
    }


 
});

router.patch("/update-people-groups", async function (req, res) {
  
  for (const property in req.body.groups) {
   // console.log('gr', req.body.groups[property].position)
    let group = {
      position : req.body.groups[property].position,
    };
  
    GroupMember.update(group, { where: { group : req.body.groups[property].groupId } })
      .then((result) => {
        if (result) {
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        console.log('errrr', err)
        res.status(503).send({ error: err.original });
      });
      
    }
    setTimeout(function () {
    res.status(200).send({ message: "Data updated successfully!"});
  }, 500)
    
  });

router.get("/people-by-ids", function (req, res) {
  const { ids } = req.query;
  People.findAll({
    attributes: ["id", "firstname", "lastname"],
    where: { id: { [Sq.Op.in]: JSON.parse(ids) } },
  })
    .then((result) => {
      if (result) {
        let peoples = [];
        result.map((rlt) => {
          peoples.push({
            id: rlt.id,
            name: [rlt.firstname, rlt.lastname].join(" "),
          });
        });
        res.status(200).send(peoples);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});
/**
 * Manage Groups
 */
router.get("/group", function (req, res) {
  let { page, limit, sort, order, search, userId, access, role } = req.query;
 // console.log('role', role)
  if(role !== "Super Admin") {
  if (page && limit) {
    Group.findAndCountAll({include: [
      {
        model: GroupMember,
        where: {
          people: userId
      }
      },
    ],})
      .then((total) => {
        let _where = {};
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: [
                {
                  name: { [Sq.Op.iLike]: `%${search}%` },
                },
                Sq.where(Sq.cast(Sq.col("group.group_type"), "varchar"), {
                  [Sq.Op.iLike]: `%${search}%`,
                }),
              ],
            },
          };
        }
      
        getData(userId, access).then((list) => {
        //  console.log('ssss', list)
          getHierarchy(list).then((childGroupIds) => {
           // console.log('sjjss', childGroupIds)
            Group.findAll({
              where: { id: { [Sq.Op.in]: childGroupIds } },
              include: [
                {
                  model: GroupMember,
                  include: [
                    {
                      model: People,
                      attributes: [
                        "preferred_name",
                        "firstname",
                        "middle_name",
                        "lastname",
                        "email",
                      ],
                    },
                  ],
                },
              ],
              order: [["name", "ASC"]],
            })
              .then((result) => {
                console.log('m here');
                if(result) {
                   Group.findAll({
          attributes: ["group_type", "name", "id", "picture_url", "amount_entry_as_totals_only"],
          include: [
            {
              model: GroupMember,
              where: {
                [Sq.Op.and]: [
                 { 
                   people : userId
                 },
                 {
                  [Sq.Op.or]: [
                    {
                      position : getAccess(access)
                    },
                   
                   
                  ]
                 }
                ]
                },
              include: [
                {
                  model: People,
                  attributes: [
                    "preferred_name",
                    "firstname",
                    "middle_name",
                    "lastname",
                    "email",
                  ],
                },
              ],
            },
          ],
        })
          .then((response) => {
           result = result.concat(response)
          var ar = getUnique(result)
          result = ar;
         // console.log('aaaa2', result.length)
          //  if (sort) {
          //   result = result.sort(dynamicSort(sort, order));
          // }
          let offset = (page - 1) * limit;
          let retresult = result.slice(
            offset,
            Math.min(result.length, Number(offset) + Number(limit))
          );
          if (result) {
            if (search == "null") {
              console.log('eee', result.length)
              res.status(200).send({ count: result.length, rows: retresult });
            } else {
              res.status(200).send({ count: result.length, rows: retresult });
            }
          } else {
            res.status(400).send({ success: 0 });
          }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
                }
               
               //console.log('myResult', result)
              })
              .catch((err) => {
                console.log('eeee', err)
              });
          })
    
        }).catch((err) => {
          console.log('eee', err)
        });
       
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  } else {
    Group.findAll({
      include: [
        {
          model: GroupMember,
          include: [
            {
              model: People,
              attributes: [
                "preferred_name",
                "firstname",
                "middle_name",
                "lastname",
                "email"
              ],
            },
          ],
        },
      ],
      order: [["name", "ASC"]],
    })
      .then((result) => {
        res.status(200).send(result);
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  }

}
else {
  if (page && limit) {

    Group.findAndCountAll()
      .then((total) => {
        let _where = {};
        if (search !== "null") {
          _where = {
            where: {
              [Sq.Op.or]: [
                {
                  name: { [Sq.Op.iLike]: `%${search}%` },
                },
                Sq.where(Sq.cast(Sq.col("group.group_type"), "varchar"), {
                  [Sq.Op.iLike]: `%${search}%`,
                }),
              ],
            },
          };
        }

        Group.findAll({
          ..._where,
          attributes: ["group_type", "name", "id", "picture_url", "amount_entry_as_totals_only"],
          include: [
            {
              model: GroupMember,
              include: [
                {
                  model: People,
                  attributes: [
                    "preferred_name",
                    "firstname",
                    "middle_name",
                    "lastname",
                    "email",
                  ],
                },
              ],
            },
          ],
        })
          .then((result) => {
            if (sort) {
              result = result.sort(dynamicSort(sort, order));
            }
            let offset = (page - 1) * limit;
            let retresult = result.slice(
              offset,
              Math.min(result.length, Number(offset) + Number(limit))
            );
            if (result) {
              if (search == "null") {
                res.status(200).send({ count: total.count, rows: retresult });
              } else {
                res.status(200).send({ count: result.length, rows: retresult });
              }
            } else {
              res.status(400).send({ success: 0 });
            }
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  } else {
    Group.findAll({
      include: [
        {
          model: GroupMember,
          include: [
            {
              model: People,
              attributes: [
                "preferred_name",
                "firstname",
                "middle_name",
                "lastname",
                "email",
              ],
            },
          ],
        },
      ],
      order: [["name", "ASC"]],
    })
      .then((result) => {
        res.status(200).send(result);
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  }
}
});

function getUnique(array){
  const result = [];
  const map = new Map();
  for (const item of array) {
    console.log('unique', item)
      if(!map.has(item.id)){
          map.set(item.id, true);    // set any value to Map
          result.push({
              id: item.id,
              name: item.name,
              group_type : item.group_type,
              group_members : item.group_members,
              picture_url : item.picture_url
          });
      }
  }
  return result
}


router.get("/group/:id", function (req, res) {
  const { id } = req.params;
  Group.findOne({
    where: { id: id },
    include: [
      {
        model: GroupMember,
        include: [
          {
            model: People,
            attributes: [
              "preferred_name",
              "firstname",
              "middle_name",
              "lastname",
              "email",
            ],
          },
        ],
      },
    ],
  })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.delete("/group/:id", function (req, res) {
  const { id } = req.params;
  Group.destroy({ where: { id: id } })
    .then((result) => {
      res.status(200).send({ message: "Group deleted successfully!" });
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.post("/group", function (req, res) {
  Group.create(req.body)
    .then((result) => {
      if (result) {
        res.status(200).send({ message: "Group added successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.patch("/group/:id", function (req, res) {
  const { id } = req.params;
  Group.update(req.body, { where: { id: id } })
    .then((result) => {
      res.status(200).send({ message: "Group updated successfully!" });
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

// Search Group
router.get("/search-group", function (req, res) {
  const { q, role, userId, access } = req.query;
  
  if(role !== undefined && role !== "Super Admin") {
    getData(userId, access).then((list) => {
      getHierarchy(list).then((childGroupIds) => {
        Group.findAll({
          where: { 
            id: { [Sq.Op.in]: childGroupIds },
            name: { [Sq.Op.iLike]: `%${q}%` }
          },
          include: [
            {
              model: GroupMember,
              include: [
                {
                  model: People,
                  attributes: [
                    "preferred_name",
                    "firstname",
                    "middle_name",
                    "lastname",
                    "email",
                  ],
                },
              ],
            },
          ],
          order: [["name", "ASC"]],
        })
          .then((result) => {
           // console.log('reee', result.length)
            if(result) {
               Group.findAll({
                attributes: ["id", "name", "parent_group"],
                where: {
                  parent_group: {
                    [Sq.Op.ne]: null,
                  },
                  name: { [Sq.Op.iLike]: `%${q}%` }
                  
                },
               include: [
            {
               model: GroupMember,
             where: {
              [Sq.Op.and]: [
             { 
               people : userId
             },
             {
              [Sq.Op.or]: [
                {
                  position : getAccess(access)
                },
              ]
             }
            ]
            },
          include: [
            {
              model: People,
              attributes: [
                "preferred_name",
                "firstname",
                "middle_name",
                "lastname",
                "email",
              ],
            },
          ],
        },
      ],
    })
      .then((response) => {
       result = result.concat(response)
        var ar = getUnique(result)
      result = ar;
     // console.log('ress2222', result)
      
      if (result) {
        
          console.log('eee', result.length)
          
          res.status(200).send(result);
       
      } else {
        res.status(400).send({ success: 0 });
      }
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
            }
           
           //console.log('myResult', result)
          })
          .catch((err) => {
            console.log('eeee', err)
          });
      })

    }).catch((err) => {
      console.log('eee', err)
    });
   
  
 
  // Group.findAll({
  //   attributes: ["id", "name", "parent_group"],
  //   where: { group_type: 'Temple', name: { [Sq.Op.iLike]: `%${q}%` } },
  //   where: {
  //     parent_group: {
  //       [Sq.Op.ne]: null,
  //     },
  //     name: { [Sq.Op.iLike]: `%${q}%` },
  //   },
  //   include: [
  //     {
  //       model: GroupMember,
  //       include: [
  //         {
  //           model: People,
  //           attributes: [
  //             "preferred_name",
  //             "firstname",
  //             "middle_name",
  //             "lastname",
  //             "email",
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // })
  //   .then((items) => {
  //     if (items) {
  //       res.status(200).send(items);
  //     } else {
  //       res.status(404).send({ success: 0 });
  //     }
  //   })
  //   .catch((err) => {
  //     res.send({ error: err.original });
  //   });
  }
  else
  {
    Group.findAll({
      attributes: ["id", "name", "parent_group"],
      where: {
        name: { [Sq.Op.iLike]: `%${q}%` },
      },
      include: [
        {
          model: GroupMember,
          include: [
            {
              model: People,
              attributes: [
                "preferred_name",
                "firstname",
                "middle_name",
                "lastname",
                "email",
              ],
            },
          ],
        },
      ],
    })
      .then((items) => {
        if (items) {
          res.status(200).send(items);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        res.send({ error: err.original });
      });
  }
});

periodExists = (start_date, end_date, month) => {
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  Period.findAll({
    where: {
      is_active : 1,
      [Sq.Op.or]: {
        start: {
          [Sq.Op.between]: [startDate, endDate],
        },
        end: {
          [Sq.Op.between]: [startDate, endDate],
        },
        [Sq.Op.and]: {
          start: {
            [Sq.Op.lte]: startDate,
          },
          end: {
            [Sq.Op.gte]: startDate,
          },
        },
      },
    },
  })
    .then((result) => {
      return result.length;
    })
    .catch((err) => {
      return err.original;
    });
};

router.get("/check-period", function (req, res) {
  const startDate = new Date(req.query.start);
  const endDate = new Date(req.query.end);
  Period.findAll({
    is_active : 1,
    where: {
      [Sq.Op.or]: {
        start: {
          [Sq.Op.between]: [startDate, endDate],
        },
        end: {
          [Sq.Op.between]: [startDate, endDate],
        },
        [Sq.Op.and]: {
          start: {
            [Sq.Op.lte]: startDate,
          },
          end: {
            [Sq.Op.gte]: startDate,
          },
        },
      },
    },
  })
    .then((result) => {
      res.send({ dd: result.length });
    })
    .catch((err) => {
      res.send(err.original);
    });
});

// Search Books
router.get("/search-books", function (req, res) {
  const { q } = req.query;
  Item.findAll({
    attributes: ["id", "name"],
    where: { item_type: "Book", name: { [Sq.Op.iLike]: `%${q}%` } },
  })
    .then((items) => {
      if (items) {
        res.status(200).send(items);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

// Get Book By Ids
router.get("/book-by-ids", function (req, res) {
  const { ids } = req.query;
  Item.findAll({
    attributes: ["id", "name"],
    where: { item_type: "Book", id: { [Sq.Op.in]: JSON.parse(ids) } },
  })
    .then((items) => {
      if (items) {
        res.status(200).send(items);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

/**
 * Manage Group Members
 */
router.post("/group-member", function (req, res) {
  GroupMember.create(req.body)
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.get("/group-member", function (req, res) {
  GroupMember.findAll({
    include: [
      {
        model: People,
        attributes: [
          "preferred_name",
          "firstname",
          "middle_name",
          "lastname",
          "email",
        ],
      },
    ],
  })
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

router.patch("/group-member/:id", async function (req, res) {
  const { id } = req.params;
  GroupMember.update(req.body, { where: { id: id } })
    .then((result) => {
      if (result) {
        res.status(200).send({ message: "Group Member updated successfully!" });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});
getArrOfArrToStrings = (field,arr_data) => {
  // console.log('field', field, 'arra', arr_data);
 let hasNonZero = false;
  let strng = "{";
  arr_data.map((data, key) => {
    if (key !== 0) {
      strng += ",";
    }
    if (field !== null && typeof field[key] !== "undefined") {
      data=data + field[key];
    }
    strng += data;
    if (data > 0) {
      hasNonZero = true;
    }
  });
  strng += "}";
  // console.log('string', strng);
  return hasNonZero ? strng : null;
};

getSumOfArrays = (array1, array2) => {
// console.log('array1', array1, 'array2', array2)
  var sum = 0;
    sum = array1.map(function (num, idx) {
    return parseInt(num) + parseInt(array2[idx]);
  });
    return sum;
};
getArrOfArrToString = (arr_data) => {
  let strng = "{";
  arr_data.map((data, key) => {
    if (key !== 0) {
      strng += ",";
    }
    const arrToStrng = getArrToString(data);
    strng += arrToStrng === null ? "{0,0,0,0,0,0,0}" : getArrToString(data);
  });
  strng += "}";
  return strng;
};

getArrToString = (arr_data) => {
  let hasNonZero = false;
  let strng = "{";
  arr_data.map((data, key) => {
    if (key !== 0) {
      strng += ",";
    }
    strng += data;
    if (data > 0) {
      hasNonZero = true;
    }
  });
  strng += "}";
  return hasNonZero ? strng : null;
};
/**
 * Add Sankirtan Goal
 */
router.post("/goal", function (req, res) {
  let goalData = req.body;
  goalData = {
    ...goalData,
    msf_book_points_goal: getArrToString(goalData.msf_book_points_goal),
    msf_bbt_amount_goal: getArrToString(goalData.msf_bbt_amount_goal),
    msf_group_amount_goal: getArrToString(goalData.msf_group_amount_goal),

    msf_book_points_goal_total: getArrToString(goalData.msf_book_points_goal),
    msf_bbt_amount_goal_total: getArrToString(goalData.msf_bbt_amount_goal),
    msf_group_amount_goal_total: getArrToString(goalData.msf_group_amount_goal),

    annual_book_points_goal: getArrayValueSum(goalData.msf_book_points_goal),
    annual_bbt_amount_goal: getArrayValueSum(goalData.msf_bbt_amount_goal),
    annual_group_amount_goal: getArrayValueSum(goalData.msf_group_amount_goal),

    annual_book_points_goal_total: getArrayValueSum(
      goalData.msf_book_points_goal
    ),
    annual_bbt_amount_goal_total: getArrayValueSum(
      goalData.msf_bbt_amount_goal
    ),
    annual_group_amount_goal_total: getArrayValueSum(
      goalData.msf_group_amount_goal
    ),
  };
  BusinessPlanSummary.create(goalData)
    .then(async (result) => {
      if (result) {
        const response = await roleUpSankirtanGoal(
          req.body.parent_group_id,
          req.body.year.toString(),
          req.body
        );
        if (!response) {
          return res.status(503).send({
            success: 0,
            message: "Something went wrong in roll-up.",
          });
        } else {
          res.status(200).send(result);
        }
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

moneyToNumber = (money) => {
  
  if(money!== undefined && money!== null)
  {
  money = money.replace("$", "");
  money = money.replace("₹", "");
  money = money.split(",").join("");
  return money;
  }
  else {
    return null;
  }
  // console.log('resulted', money)
  
  
};

mergeMSFRecords = (records1, records2) => {
  const mergedData = records1.map((value, key) => {
    const value1 = isNaN(value) ? moneyToNumber(value) : value;
    let value2 = 0;
    if (typeof records2[key] !== "undefined") {
      value2 = isNaN(records2[key])
        ? moneyToNumber(records2[key])
        : records2[key];
    }
    return +value1 + +value2;
  });
  return mergedData;
};

// Return the correct values need to roll-up
updateGoalData = (existing, coming) => {
  if (existing !== null) {
    existing.map((value, key) => {
      if (typeof coming[key] !== "undefined") {
        value = isNaN(value) ? moneyToNumber(value) : value;
        const coming_value = isNaN(coming[key])
          ? moneyToNumber(coming[key])
          : coming[key];
        coming[key] = +coming_value - +value;
      }
    });
  }
  return coming;
};

router.patch("/goal/:id", async function (req, res) {
  const { id } = req.params;
  let goalData = req.body;
  const formattedGoalData = await BusinessPlanSummary.findOne({ where: { id } })
    .then((result) => {
      const request_msf_book_points_goal = [...goalData.msf_book_points_goal];
      const request_msf_bbt_amount_goal = [...goalData.msf_bbt_amount_goal];
      const request_msf_group_amount_goal = [...goalData.msf_group_amount_goal];
      goalData = {
        ...goalData,
        msf_book_points_goal: updateGoalData(
          result.msf_book_points_goal,
          goalData.msf_book_points_goal
        ),
        msf_bbt_amount_goal: updateGoalData(
          result.msf_bbt_amount_goal,
          goalData.msf_bbt_amount_goal
        ),
        msf_group_amount_goal: updateGoalData(
          result.msf_group_amount_goal,
          goalData.msf_group_amount_goal
        ),
      };
      let msf_book_point_goal_merge = [];
      let msf_bbt_amount_goal_merge = [];
      let msf_group_amount_goal_merge = [];

      if (
        result.msf_book_points_goal_total.length >=
        goalData.msf_book_points_goal.length
      ) {
        msf_book_point_goal_merge = mergeMSFRecords(
          result.msf_book_points_goal_total,
          goalData.msf_book_points_goal
        );
        msf_bbt_amount_goal_merge = mergeMSFRecords(
          result.msf_bbt_amount_goal_total,
          goalData.msf_bbt_amount_goal
        );
        msf_group_amount_goal_merge = mergeMSFRecords(
          result.msf_group_amount_goal_total,
          goalData.msf_group_amount_goal
        );
      } else {
        msf_book_point_goal_merge = mergeMSFRecords(
          goalData.msf_book_points_goal,
          result.msf_book_points_goal_total
        );
        msf_bbt_amount_goal_merge = mergeMSFRecords(
          goalData.msf_bbt_amount_goal,
          result.msf_bbt_amount_goal_total
        );
        msf_group_amount_goal_merge = mergeMSFRecords(
          goalData.msf_group_amount_goal,
          result.msf_group_amount_goal_total
        );
      }
      // End

      goalData = {
        ...goalData,
        msf_book_points_goal: getArrToString(request_msf_book_points_goal),
        msf_bbt_amount_goal: getArrToString(request_msf_bbt_amount_goal),
        msf_group_amount_goal: getArrToString(request_msf_group_amount_goal),

        msf_book_points_goal_total: getArrToString(msf_book_point_goal_merge),
        msf_bbt_amount_goal_total: getArrToString(msf_bbt_amount_goal_merge),
        msf_group_amount_goal_total: getArrToString(
          msf_group_amount_goal_merge
        ),

        annual_book_points_goal: getArrayValueSum(request_msf_book_points_goal),
        annual_bbt_amount_goal: getArrayValueSum(request_msf_bbt_amount_goal),
        annual_group_amount_goal: getArrayValueSum(
          request_msf_group_amount_goal
        ),

        annual_book_points_goal_total: getArrayValueSum(
          msf_book_point_goal_merge
        ),
        annual_bbt_amount_goal_total: getArrayValueSum(
          msf_bbt_amount_goal_merge
        ),
        annual_group_amount_goal_total: getArrayValueSum(
          msf_group_amount_goal_merge
        ),
      };
      return goalData;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
  if (!formattedGoalData) {
    return res.status(503).send({ success: 0, message: "Goal not updated!" });
  }
  BusinessPlanSummary.update(formattedGoalData, { where: { id: id } })
    .then(async (result) => {
      const response = await roleUpSankirtanGoal(
        req.body.parent_group_id,
        req.body.year.toString(),
        req.body
      );
      if (!response) {
        return res.status(503).send({
          success: 0,
          message: "Something went wrong in roll-up.",
        });
      } else {
        res.status(200).send({ message: "Goal updated successfully!" });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

// Update Actual Data of Goal
router.patch("/actual-goal/:id", async function (req, res) {
  const { id } = req.params;
  let goalData = req.body;
  const formattedGoalData = await BusinessPlanSummary.findOne({ where: { id } })
    .then((result) => {
      const request_msf_actual_group_amount = [
        ...goalData.msf_actual_group_amount,
      ];
      goalData = {
        ...goalData,
        msf_actual_group_amount: updateGoalData(
          result.msf_actual_group_amount,
          goalData.msf_actual_group_amount
        ),
      };
      let msf_actual_group_amount_merge = goalData.msf_actual_group_amount;
      if (result.msf_actual_group_amount_total !== null) {
        if (
          result.msf_actual_group_amount_total.length >=
          goalData.msf_actual_group_amount.length
        ) {
          msf_actual_group_amount_merge = mergeMSFRecords(
            result.msf_actual_group_amount_total,
            goalData.msf_actual_group_amount
          );
        } else {
          msf_actual_group_amount_merge = mergeMSFRecords(
            goalData.msf_actual_group_amount,
            result.msf_actual_group_amount_total
          );
        }
      }
      // End

      goalData = {
        ...goalData,
        msf_actual_group_amount: getArrToString(
          request_msf_actual_group_amount
        ),

        msf_actual_group_amount_total: getArrToString(
          msf_actual_group_amount_merge
        ),

        annual_actual_group_amount: getArrayValueSum(
          request_msf_actual_group_amount
        ),

        annual_actual_group_amount_total: getArrayValueSum(
          msf_actual_group_amount_merge
        ),
      };
      return goalData;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
  if (!formattedGoalData) {
    return res.status(503).send({ success: 0, message: "Goal not updated!" });
  }
  BusinessPlanSummary.update(formattedGoalData, { where: { id: id } })
    .then(async (result) => {
      const response = await roleUpSankirtanGoalActual(
        req.body.parent_group_id,
        req.body.year.toString(),
        req.body
      );
      if (!response) {
        return res.status(503).send({
          success: 0,
          message: "Something went wrong in roll-up.",
        });
      } else {
        res.status(200).send({ message: "Goal updated successfully!" });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.get("/goal", async function (req, res) {
  const { group_id, year } = req.query;
  BusinessPlanSummary.findOne({ where: { group_id: group_id, year: year } })
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

// Goal Setting UI
getPeriodTypeData = (val_arr, number) => {
  return !Array.isArray(val_arr) || typeof val_arr[number] === "undefined"
    ? 0
    : val_arr[number];
};

getGoalSettingData = (summary) => {
  let data = {};
  data["group"] = {};
  data["child"] = {};
  data["total"] = {};
  // Arrange Group Level Data
  data["group"]["goal"] = {
    book_point:  summary.book_points_goal,
    amount_collected:summary.group_amount_goal,
    amount_remitted: summary.bbt_amount_goal,
  };
  data["group"]["actual"] = {
    book_point: summary.actual_book_points,
    amount_collected: summary.actual_bbt_amount,
    amount_remitted: summary.actual_group_amount,
  };

  // Arrange Child Rollup Data
  data["child"]["goal"] = {
    book_point: summary.book_points_goal_roll_up,
    amount_collected: summary.group_amount_goal_roll_up,
    amount_remitted: summary.bbt_amount_goal_roll_up,
  };
  data["child"]["actual"] = {
    book_point: summary.actual_book_points_roll_up,
    amount_collected:  summary.actual_bbt_amount_roll_up,
    amount_remitted:  summary.actual_group_amount_roll_up,
  };

  // Arrange Total Data
  data["total"]["goal"] = {
    book_point: summary.book_points_goal_total,
    amount_collected: summary.group_amount_goal_total,
    amount_remitted: summary.bbt_amount_goal_total,
  };
  data["total"]["actual"] = {
    book_point: summary.actual_book_points_total,
    amount_collected:   summary.actual_group_amount_total,
    amount_remitted: summary.actual_bbt_amount_total,
  };
  return data;
};

router.get("/goal-setting", async function (req, res) {
  const { group_id, year, distributor_id, period_id } = req.query;
  let goal_description = ""
  let _where = {
    group_id: group_id,
    year: year,
  };
  if( typeof period_id === "undefined"){
    _where = { ..._where, period_id: null }; 
  }else{
    _where = { ..._where, period_id: period_id }; 
  }
  if (distributor_id) {
    _where = { ..._where, distributor_id: distributor_id };
  }else{
    _where = { ..._where, distributor_id:  null};
  }
  // if (period_id) {
    console.log(_where);
    // const period = await Period.findOne({ where: { id: period_id } });
    const summaryDetails = await BusinessPlanSummary.findOne({
      where: _where,
      include: [{
        model: People,
        as: 'createdBy',
        attributes: ["preferred_name","firstname", "middle_name","lastname"],
      },
      {
        model: People,
        as: 'modifiedBy',
        attributes: ["preferred_name","firstname", "middle_name","lastname"],
      }
    ],
    });
    if( typeof period_id !== "undefined" && period_id != null){
      let goalDescription = await GoalDescription.findOne({
        attributes: [
          "period_goal_description"
        ],
        where: {
          period_id: period_id,
          group_id : group_id
        },
      })
      if(goalDescription != null){
        goal_description = goalDescription.period_goal_description
      }
    }
    else {
      let goalDescription = await GoalDescription.findOne({
        attributes: [
          "year_goal_description"
        ],
        where: {
          year: year,
          group_id : group_id
        },
      })
      if(goalDescription != null){
       goal_description = goalDescription.year_goal_description
      }
    }
    let data = await getGoalSettingData(
      summaryDetails,
    );
  // let goal_description = "";
  //  console.log('summary', goalDescription)
  // if (summaryDetails !== null ){
  //   goal_description = summaryDetails.my_goal_description.name_goal_description
  // }
    data = {
      ...data,
      id: summaryDetails.id,
      distributor_id: summaryDetails.distributor_id,
      group_id: summaryDetails.group_id,
      year: summaryDetails.year,
      organization_id: summaryDetails.organization_id,
      created_date: summaryDetails.created_date,
      last_modified_date: summaryDetails.last_modified_date,
      created_by_name: summaryDetails.createdBy.firstname + ' '+ summaryDetails.createdBy.lastname,
      last_modified_by_name: summaryDetails.modifiedBy.firstname + ' '+ summaryDetails.modifiedBy.lastname,
      goal_description
    };
    res.status(200).send(data);
  // } 
});

const rollupGoals = async (
  {
    group_id,
    year,
    period_id,
    created_by_id,
    last_modified_by_id,
    organization_id
  },
  { goal_book_points, goal_amount_remitted_bbt, goal_amount_collected },
  existing_data = []
) => {
  let _where = {
    group_id,
    year,
    period_id,
  };
  BusinessPlanSummary.findOne({ where: _where }).then(async (result) => {
    if (!result) {
      // Create New Business Summary
      let goal = {
        year: year,
        period_id:period_id,
        group_id: group_id,
      };
      // if (type === "MSF") {
      //   goal = {
      //     ...goal,
      //     msf_book_points_goal_roll_up: goal_book_points,
      //     msf_bbt_amount_goal_roll_up: goal_amount_remitted_bbt,
      //     msf_group_amount_goal_roll_up: goal_amount_collected,
      //     msf_book_points_goal_total: goal_book_points,
      //     msf_bbt_amount_goal_total: goal_amount_remitted_bbt,
      //     msf_group_amount_goal_total: goal_amount_collected,
      //   };
      // } else {
      //   goal = {
      //     ...goal,
      //     monthly_book_points_goal_roll_up: goal_book_points,
      //     monthly_bbt_amount_goal_roll_up: goal_amount_remitted_bbt,
      //     monthly_group_amount_goal_roll_up: goal_amount_collected,
      //     monthly_book_points_goal_total: goal_book_points,
      //     monthly_bbt_amount_goal_total: goal_amount_remitted_bbt,
      //     monthly_group_amount_goal_total: goal_amount_collected,
      //   };
      // }
      goal = {
        ...goal,
        book_points_goal_roll_up: goal_book_points,
        bbt_amount_goal_roll_up: goal_amount_remitted_bbt,
        group_amount_goal_roll_up: goal_amount_collected,
        book_points_goal_total: goal_book_points,
        bbt_amount_goal_total: goal_amount_remitted_bbt,
        group_amount_goal_total: goal_amount_collected,
        created_by_id: created_by_id,
        last_modified_by_id: created_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.create(goal);
      updateYearly(
        {
          group_id: group_id,
          year,
          created_by_id,
          last_modified_by_id,
          organization_id,
          type:"roll_up",
          distributor_id:0,
        },
        {
          goal_book_points,
          goal_amount_remitted_bbt,
          goal_amount_collected,
        }
      );
      const getParent = await Group.findOne({ where: { id: group_id } });
      if (
        typeof getParent.parent_group !== "undefined" &&
        getParent.parent_group !== null
      ) {
        rollupGoals(
          {
            group_id: getParent.parent_group,
            year,
            period_id,
            created_by_id,
            last_modified_by_id,
            organization_id,
          },
          {
            goal_book_points,
            goal_amount_remitted_bbt,
            goal_amount_collected,
          }
        );
      } else {
        console.log("No More Parent Group Found!");
      }
    } else {
      // Update Existing Business Summary
      let goal = {};
      goal = {
        book_points_goal_roll_up: 
          adjustExistingGoal(
            result.book_points_goal_roll_up,
            goal_book_points,
            existing_data.old_book_point_goal
              ? existing_data.old_book_point_goal
              : 0,
        ),
        bbt_amount_goal_roll_up: 
          adjustExistingGoal(
            result.bbt_amount_goal_roll_up,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal
              ? existing_data.old_bbt_amount_goal
              : 0,
          ),
        group_amount_goal_roll_up: 
          adjustExistingGoal(
            result.group_amount_goal_roll_up,
            goal_amount_collected,
            existing_data.old_group_amount_goal
              ? existing_data.old_group_amount_goal
              : 0,
          ),
        
        book_points_goal_total:
          adjustExistingGoal(
            result.book_points_goal_total,
            goal_book_points,
            existing_data.old_book_point_goal
              ? existing_data.old_book_point_goal
              : 0,
          ),
        
        bbt_amount_goal_total: 
          adjustExistingGoal(
            result.bbt_amount_goal_total,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal
              ? existing_data.old_bbt_amount_goal
              : 0,
          ),
        
        group_amount_goal_total:
          adjustExistingGoal(
            result.group_amount_goal_total,
            goal_amount_collected,
            existing_data.old_group_amount_goal
              ? existing_data.old_group_amount_goal
              : 0,
          ),
      }; 
      goal = {
        ...goal,
        last_modified_by_id: created_by_id,
        organization_id: organization_id
      };
      
      await BusinessPlanSummary.update(goal, { where: { id: result.id } });
      updateYearly(
        {
          group_id: group_id,
          year,
          created_by_id,
          last_modified_by_id,
          organization_id,
          type:"roll_up",
          distributor_id:0,
        },
        {
          goal_book_points,
          goal_amount_remitted_bbt,
          goal_amount_collected,
        },
        existing_data
      );
      const getParent = await Group.findOne({ where: { id: group_id } });
      if (
        typeof getParent.parent_group !== "undefined" &&
        getParent.parent_group !== null
      ) {
        rollupGoals(
          {
            group_id: getParent.parent_group,
            year,
            period_id,
            created_by_id,
            last_modified_by_id,
            organization_id,
          },
          {
            goal_book_points,
            goal_amount_remitted_bbt,
            goal_amount_collected,
          },
          existing_data
        );
      } else {
        console.log("No More Parent Group Found!");
      }
    }
  });
  return true;
};

router.post("/goal-setting", async function (req, res) {
 
  let goalData = req.body;
  if (typeof goalData.period_id !== "undefined") {
    const period = await Period.findOne({ where: { id: goalData.period_id, is_active : 1 } });
    let goal_book_points= +goalData.goal_book_points;
    let goal_amount_remitted_bbt= +goalData.goal_amount_remitted_bbt;
    let goal_amount_collected= +goalData.goal_amount_collected;
    let goal = {
      year: goalData.year,
      group_id: goalData.group_id,
      period_id : goalData.period_id
    };
    if (
      typeof goalData.distributor_id !== "undefined" &&
      goalData.distributor_id > 0
    ) {
      goal = { ...goal, distributor_id: goalData.distributor_id };
    }
    goal = {
      ...goal,
      book_points_goal: goal_book_points,
      bbt_amount_goal: goal_amount_remitted_bbt,
      group_amount_goal: goal_amount_collected,
      book_points_goal_total: goal_book_points,
      bbt_amount_goal_total: goal_amount_remitted_bbt,
      group_amount_goal_total: goal_amount_collected,
      created_by_id: goalData.created_by_id,
      last_modified_by_id: goalData.created_by_id,
      organization_id: goalData.organization_id,
    };
    await BusinessPlanSummary.create(goal);
    let goal_description_data = {
      year: goalData.year,
      group_id: goalData.group_id,
      period_goal_description: goalData.goal_description,
      period_id : goalData.period_id
    };
    await GoalDescription.create(goal_description_data);

    // return res.send('done');
    
    updateYearly({
      group_id: goalData.group_id,
      year: goalData.year.toString(),
      created_by_id: goalData.created_by_id,
      last_modified_by_id: goalData.created_by_id,
      organization_id: goalData.organization_id,
      type : "no_roll_up",
      distributor_id:goalData.distributor_id,
    },
    {
      goal_book_points,
      goal_amount_remitted_bbt,
      goal_amount_collected,
    });
    // return res.send('done');
    if (typeof goalData.distributor_id !== "undefined" && goalData.distributor_id > 0) 
      {
        DistributionGoals(
          {
            group_id: goalData.group_id,
            year: goalData.year.toString(),
            period_id: goalData.period_id,
            created_by_id: goalData.created_by_id,
            last_modified_by_id: goalData.created_by_id,
            organization_id: goalData.organization_id,
          },
          {
            goal_book_points,
            goal_amount_remitted_bbt,
            goal_amount_collected,
          }
        );
      }
      
      const getParent = await Group.findOne({ where: { id: goalData.group_id } });
      if (
        typeof getParent.parent_group !== "undefined" &&
        getParent.parent_group !== null
      ) {
        rollupGoals(
          {
            group_id: getParent.parent_group,
            year: goalData.year.toString(),
            period_id: goalData.period_id,
            created_by_id: goalData.created_by_id,
            last_modified_by_id: goalData.created_by_id,
            organization_id: goalData.organization_id,
          },
          {
            goal_book_points,
            goal_amount_remitted_bbt,
            goal_amount_collected,
          }
        );
      }
    return res.send(goal);
  }
});

const adjustExistingGoal = (current, coming, old) => {
  if (current) {
    let current_test = (current != null &&  current !='')? isNaN(current) ? moneyToNumber(current) :  current : 0;
    let coming_test  = (coming != null &&  coming !='') ? isNaN(coming) ? moneyToNumber(coming) :  coming : 0;
    let old_test =  (old != null &&  old !='') ? isNaN(old) ? moneyToNumber(old) :  old : 0;  
    let result= parseInt(current_test) - parseInt(old_test) + parseInt(coming_test);
    return result;
  } else {
    return coming;
  }
};
const setPeriodValueInExistingArray = (
  existing,
  number,
  { goal_book_points, goal_amount_remitted_bbt, goal_amount_collected }
) => {
  let limit = 0;
  if (existing.old_book_point_goal) {
    limit =
      existing.old_book_point_goal.length > number
        ? existing.old_book_point_goal.length
        : number;
  } else {
    limit = number;
  }
  const book_point_goal = [];
  const bbt_amount_goal = [];
  const group_amount_goal = [];
  for (let i = 0; i < limit; i++) {
    if (i === number - 1) {
      book_point_goal.push(+goal_book_points);
      bbt_amount_goal.push(+goal_amount_remitted_bbt);
      group_amount_goal.push(+goal_amount_collected);
    } else {
      const point =
        existing.old_book_point_goal && existing.old_book_point_goal[i]
          ? isNaN(existing.old_book_point_goal[i])
            ? moneyToNumber(existing.old_book_point_goal[i])
            : existing.old_book_point_goal[i]
          : 0;
      const bbt =
        existing.old_bbt_amount_goal && existing.old_bbt_amount_goal[i]
          ? isNaN(existing.old_bbt_amount_goal[i])
            ? moneyToNumber(existing.old_bbt_amount_goal[i])
            : existing.old_bbt_amount_goal[i]
          : 0;
      const group =
        existing.old_group_amount_goal && existing.old_group_amount_goal[i]
          ? isNaN(existing.old_group_amount_goal[i])
            ? moneyToNumber(existing.old_group_amount_goal[i])
            : existing.old_group_amount_goal[i]
          : 0;
      book_point_goal.push(+point);
      bbt_amount_goal.push(+bbt);
      group_amount_goal.push(+group);
    }
  }
  return { book_point_goal, bbt_amount_goal, group_amount_goal };
};
router.patch("/goal-setting/:id", async function (req, res) {
  const { id } = req.params;
  let goalData = req.body;
  if (typeof goalData.period_id !== "undefined") {
    // const period = await Period.findOne({ where: { id: goalData.period_id } });
    const goal_book_points = goalData.goal_book_points;
    const goal_amount_remitted_bbt = isNaN(goalData.goal_amount_remitted_bbt)
      ? moneyToNumber(goalData.goal_amount_remitted_bbt)
      : goalData.goal_amount_remitted_bbt;
    const goal_amount_collected = isNaN(goalData.goal_amount_collected)
      ? moneyToNumber(goalData.goal_amount_collected)
      : goalData.goal_amount_collected;
    BusinessPlanSummary.findOne({ where: { id } }).then(async (result) => {
      let existing_data = {};
      existing_data = {
        old_book_point_goal: result.book_points_goal,
        old_bbt_amount_goal: result.bbt_amount_goal,
        old_group_amount_goal: result.group_amount_goal,
      };
      let goal = {};
      goal = {
        ...goal,
        // end old summary
        book_points_goal:adjustExistingGoal(
          result.book_points_goal,
          goal_book_points,
          existing_data.old_book_point_goal,
        ), 
        bbt_amount_goal:adjustExistingGoal(
          result.bbt_amount_goal,
          goal_amount_remitted_bbt,
          existing_data.old_bbt_amount_goal,
        ),
        group_amount_goal:adjustExistingGoal(
          result.group_amount_goal,
          goal_amount_collected,
          existing_data.old_group_amount_goal,
        ),
        book_points_goal_total: 
          adjustExistingGoal(
            result.book_points_goal_total,
            goal_book_points,
            existing_data.old_book_point_goal,
        ),
        bbt_amount_goal_total: 
          adjustExistingGoal(
            result.bbt_amount_goal_total,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
        ),
        group_amount_goal_total: 
          adjustExistingGoal(
            result.group_amount_goal_total,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
      };
     
      goal = {
        ...goal,
        last_modified_by_id: goalData.created_by_id,
        organization_id: goalData.organization_id,
      };
      await BusinessPlanSummary.update(goal, { where: { id: id } });
      const descriptionData = await GoalDescription.findOne({ where: {
        period_id: goalData.period_id,
        group_id: goalData.group_id
      }});
   
     
      if(descriptionData !== null)
      {
      if(descriptionData.length !== 0)
      {
       // console.log('desc', goalData.goal_description)
        let goal_description_data = {
          period_goal_description: goalData.goal_description
        };
        await GoalDescription.update(goal_description_data, { where: { group_id: goalData.group_id, period_id :goalData.period_id  } });
      }
      else 
      {
        let goal_description_data = {
          group_id: goalData.group_id,
          period_goal_description: goalData.goal_description,
          period_id : goalData.period_id,
          year : goalData.year
        };
        await GoalDescription.create(goal_description_data);
      }
    }
    else {
      let goal_description_data = {
        group_id: goalData.group_id,
        period_goal_description: goalData.goal_description,
        period_id : goalData.period_id,
        year : goalData.year
      };
      await GoalDescription.create(goal_description_data);
    }
      updateYearly({
        group_id: goalData.group_id,
        year: goalData.year.toString(),
        created_by_id: goalData.created_by_id,
        last_modified_by_id: goalData.created_by_id,
        organization_id: goalData.organization_id,
        type : "no_roll_up",
        distributor_id:goalData.distributor_id,
      },
      {
        goal_book_points,
        goal_amount_remitted_bbt,
        goal_amount_collected,
      },
      existing_data
      );
      // return res.send('done');
      if (typeof goalData.distributor_id !== "undefined" && goalData.distributor_id > 0) 
        {
          DistributionGoals(
            {
              group_id: goalData.group_id,
              year: goalData.year.toString(),
              period_id: goalData.period_id,
              created_by_id: goalData.created_by_id,
              last_modified_by_id: goalData.created_by_id,
              organization_id: goalData.organization_id,
            },
            {
              goal_book_points,
              goal_amount_remitted_bbt,
              goal_amount_collected,
            },
            existing_data
          );
        }
      const getParent = await Group.findOne({
        where: { id: goalData.group_id },
      });
      if (
        typeof getParent.parent_group !== "undefined" &&
        getParent.parent_group !== null
      ) {
        
        rollupGoals(
          {
            group_id: getParent.parent_group,
            year: goalData.year.toString(),
            period_id: goalData.period_id,
            created_by_id: goalData.created_by_id,
            last_modified_by_id: goalData.created_by_id,
            organization_id: goalData.organization_id,
          },
          {
            goal_book_points,
            goal_amount_remitted_bbt,
            goal_amount_collected,
          },
          existing_data
        );
      }
    });
    return res.send("Done");
  }
  else {
    const descriptionData = await GoalDescription.findOne({ where: {
      group_id: goalData.group_id,
      year: goalData.year
    }});
 //   console.log('updateddd', descriptionData)
    if(descriptionData !== null)
    {
      for(d in descriptionData)
      {
     let goal_description_data = {
      year_goal_description: goalData.goal_description
    };
    await GoalDescription.update(goal_description_data, { where: {  group_id : goalData.group_id, year: goalData.year  } }).then((result) => {
    })
   }
    }
    return res.send("Done");
  //  
  }
  
});

// RollUp GoalSetting
roleUpGoalSetting = async (group_id, goalData, formattedGoalData) => {
  let year = goalData.year.toString();
  const goalSettingData = formattedGoalData.goalSettingData;
  const goalSettingRequestData = formattedGoalData.goalSettingRequestData;

  const goalRollUpData = await BusinessPlanSummary.findOne({
    where: { group_id, year },
  })
    .then((result) => {
      let goalRollUp;
      if (result) {
        let parent_annual_book_points_goal = isNaN(
          result.annual_book_points_goal
        )
          ? moneyToNumber(result.annual_book_points_goal)
          : result.annual_book_points_goal;
        let parent_annual_bbt_amount_goal = isNaN(result.annual_bbt_amount_goal)
          ? moneyToNumber(result.annual_bbt_amount_goal)
          : result.annual_bbt_amount_goal;
        let parent_annual_group_amount_goal = isNaN(
          result.annual_group_amount_goal
        )
          ? moneyToNumber(result.annual_group_amount_goal)
          : result.annual_group_amount_goal;

        // Book Points
        if (
          goalSettingData.annual_book_points_goal >
          goalSettingRequestData.annual_book_points_goal
        ) {
          var book_points =
            goalSettingData.annual_book_points_goal -
            goalSettingRequestData.annual_book_points_goal;
          parent_annual_book_points_goal =
            parent_annual_book_points_goal + book_points;
        } else if (
          goalSettingData.annual_book_points_goal <
          goalSettingRequestData.annual_book_points_goal
        ) {
          var book_points =
            goalSettingRequestData.annual_book_points_goal -
            goalSettingData.annual_book_points_goal;
          parent_annual_book_points_goal =
            parent_annual_book_points_goal - book_points;
        }

        // BBT Amount
        if (
          goalSettingData.annual_bbt_amount_goal >
          goalSettingRequestData.annual_bbt_amount_goal
        ) {
          var bbt_amount =
            goalSettingData.annual_bbt_amount_goal -
            goalSettingRequestData.annual_bbt_amount_goal;
          parent_annual_bbt_amount_goal =
            parent_annual_bbt_amount_goal + bbt_amount;
        } else if (
          goalSettingData.annual_book_points_goal <
          goalSettingRequestData.annual_book_points_goal
        ) {
          var bbt_amount =
            goalSettingRequestData.annual_bbt_amount_goal -
            goalSettingData.annual_bbt_amount_goal;
          parent_annual_bbt_amount_goal =
            parent_annual_bbt_amount_goal - bbt_amount;
        }

        // Group Amount
        if (
          goalSettingData.annual_group_amount_goal >
          goalSettingRequestData.annual_group_amount_goal
        ) {
          var group_amount =
            goalSettingData.annual_group_amount_goal -
            goalSettingRequestData.annual_group_amount_goal;
          parent_annual_group_amount_goal =
            parent_annual_group_amount_goal + group_amount;
        } else if (
          goalSettingData.annual_group_amount_goal <
          goalSettingRequestData.annual_group_amount_goal
        ) {
          var group_amount =
            goalSettingRequestData.annual_group_amount_goal -
            goalSettingData.annual_group_amount_goal;
          parent_annual_group_amount_goal =
            parent_annual_book_points_goal - group_amount;
        }
        goalRollUp = {
          id: result.id,
          last_modified_by_id: goalData.last_modified_by_id,
          annual_book_points_goal: parent_annual_book_points_goal,
          annual_bbt_amount_goal: parent_annual_bbt_amount_goal,
          annual_group_amount_goal: parent_annual_group_amount_goal,
        };
      }
      return goalRollUp;
    })
    .catch((err) => {
      return false;
    });
  if (!goalRollUpData) {
   return false;
  }
  let rollupResponse;
  const goal_id = goalRollUpData.id;
  delete goalRollUpData.id;
  // Update roll-up for parent group
  rollupResponse = await BusinessPlanSummary.update(goalRollUpData, {
    where: { id: goal_id },
  })
    .then(async (result) => {
      return true;
    })
    .catch((err) => {
      return false;
    });

  if (!rollupResponse) {
   return false;
  }

  // Looking for the parent group of the current group
  const finalResponse = await Group.findOne({ where: { id: group_id } })
    .then((result) => {
      if (result.parent_group) {
        return roleUpGoalSetting(
          result.parent_group,
          goalData,
          formattedGoalData
        );
      } else {
        return true;
      }
    })
    .catch((err) => {
      console.log(err);
      return false;
    });

  return finalResponse;
};

router.get("/all-goal/:id", async function (req, res) {
  const { id } = req.params;
  BusinessPlanSummary.findOne({ where: { id: id } })
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

router.post("/upload/avatar", function (req, res) {
  const upload = multer({ storage: storage, fileFilter: imageFilter }).single(
    "avatar"
  );
  upload(req, res, function (err) {
    if (req.fileValidationError) {
      return res.send(req.fileValidationError);
    } else if (!req.file) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
    // Display uploaded image for user validation
    res.send(`You have uploaded this image: ${req.file.path}`);
  });
});

router.post("/upload/photos", function (req, res) {
  let upload = multer({
    storage: storage,
    fileFilter: imageFilter,
  }).array("multiple_images", 10);

  upload(req, res, function (err) {
    if (req.fileValidationError) {
      return res.send(req.fileValidationError);
    } else if (!req.files) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send({ multer: err });
    } else if (err) {
      return res.send(err);
    }

    let result = "You have uploaded these images: <hr />";
    const files = req.files;
    let index, len;

    // Loop through all the uploaded images and display them on frontend
    for (index = 0, len = files.length; index < len; ++index) {
      result += `"${files[index].path}`;
    }
    res.send(result);
  });
});

router.get("/default-group/:member_id", function (req, res) {
  const { member_id } = req.params;
  People.findOne({ where: { id: member_id } }).then((result) => {
    if (result) {
      let default_group = result.default_group;
      Group.findAll({
        attributes: [
          "id",
          "name",
          "book_distribution_reporting_level",
          "group_type",
          "sankirtan_group_type",
          "favorite_books",
        ],
        where: {
          id: default_group,
        },
      })
        .then((groupRes) => {
          res.status(200).send(groupRes);
        })
        .catch((err) => {
          res.status(404).send({ success: 0 });
        });
    } else {
      GroupMember.findAll({
        where: {
          people: member_id,
        },
      })
        .then((result) => {
          if (result) {
            let group_ids = [];
            result.map((rslt) => {
              group_ids.push(rslt.group);
            });
            Group.findAll({
              attributes: [
                "id",
                "name",
                "book_distribution_reporting_level",
                "group_type",
                "sankirtan_group_type",
                "favorite_books",
              ],
              where: {
                group_type: "Temple",
                id: { [Sq.Op.in]: group_ids },
              },
            })
              .then((groupRes) => {
                res.status(200).send(groupRes);
              })
              .catch((err) => {
                res.status(404).send({ success: 0 });
              });
          } else {
            res.status(404).send({ success: 0 });
          }
        })
        .catch((err) => {
          res.send({ error: err.original });
        });
    }
  });
});

router.get("/group-by-member-id/:member_id", function (req, res) {
  const { member_id } = req.params;
  GroupMember.findAll({
    where: {
      people: member_id,
    },
  })
    .then((result) => {
      if (result) {
        let group_ids = [];
        result.map((rslt) => {
          group_ids.push(rslt.group);
        });
        Group.findAll({
          attributes: [
            "id",
            "name",
            "book_distribution_reporting_level",
            "group_type",
            "sankirtan_group_type",
            "favorite_books",
            "amount_entry_as_totals_only"
          ],
          where: {
            group_type: "Temple",
            parent_group: {
              [Sq.Op.ne]: null,
            },
            id: { [Sq.Op.in]: group_ids },
          },
        })
          .then((groupRes) => {
            // console.log('group res is', groupRes)
            res.status(200).send(groupRes);
          })
          .catch((err) => {
            res.status(404).send({ success: 0 });
          });
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});
// Get favorite books of a particular group
router.get("/group-fav-books", function (req, res) {
  let { book_ids } = req.query;
  Item.findAll({
    attributes: ["id", "name", "cover", "status", "bbt_book_points"],
    where: {
      id: { [Sq.Op.in]: JSON.parse(book_ids) },
    },
  })
    .then((result) => {
     // console.log('res', result);
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

// Search Group
router.get("/search-people", function (req, res) {
  const { q } = req.query;
  People.findAll({
    attributes: ["id", "firstname", "lastname"],
    where: {
      [Sq.Op.or]: {
        firstname: { [Sq.Op.iLike]: `%${q}%` },
        lastname: { [Sq.Op.iLike]: `%${q}%` },
      },
    },
  })
    .then((result) => {
      if (result) {
        let peoples = [];
        result.map((rlt) => {
          peoples.push({
            id: rlt.id,
            name: [rlt.firstname, rlt.lastname].join(" "),
          });
        });
        res.status(200).send(peoples);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

// Manage Book Distribution
router.get("/book-distribution", function (req, res) {
  //console.log('working')
  const { filter_data, page, limit, sort, order, search } = req.query;
  const query_filter = JSON.parse(filter_data);
  let _where = {};
  if (
    typeof query_filter.start !== "undefined" &&
    query_filter.start !== "" &&
    typeof query_filter.end !== "undefined" &&
    query_filter.end !== ""
  ) {
    _where = {
      ..._where,
      date: {
        [Sq.Op.between]: [query_filter.start, query_filter.end],
      },
    };
  }
  if (
    typeof query_filter.group_id !== "undefined" &&
    query_filter.group_id > 0
  ) {
    _where = { ..._where, transaction_group_id: query_filter.group_id };
  }
  let _people_where = {};
  if (
    typeof query_filter.distributor_id !== "undefined" &&
    query_filter.distributor_id > 0
  ) {
    _people_where = { distributor_id: query_filter.distributor_id };
  }
  /* not working for people and book name together, will filter at end 
	let _book_where = {};
	if (
		typeof search !== 'undefined' &&
		search !=null && search.trim().length > 0
	) {
		_book_where = {
			[Sq.Op.or]: {
				name: { [Sq.Op.iLike]: `%${search}%` } ,
				}
		}
		_people_where = {
			[Sq.Op.or]: {
				firstname: { [Sq.Op.iLike]: `%${search}%` } ,
				}
		}
	}
	Transaction.findAndCountAll({ where: _where })
		.then((total) => {

			if(search !== 'null'){
				_where = {
					where:{
						[Sq.Op.or]: {
							transaction_book_points: { [Sq.Op.iLike]: `%${search}%` },
							transaction_amount: { [Sq.Op.iLike]: `%${search}%` },
						}
					}
				}
				Transaction.findAll({
					include: [
						{
							model: TransactionLineItem,
							attributes: ['id', 'item_id', 'quantity', 'price'],
							include: [
								{
									model: Item,
									where:_book_where,
									attributes: ['name', 'item_type', 'media_type', 'cover'],
								},
							],
						},
						{
							model: TransactionPeople,
							attributes: ['id', 'transaction_id', 'distributor_id'],
							include: [
								{
									model: People,
//not working with this									where:_people_where,
									attributes: [
										'preferred_name',
										'firstname',
										'middle_name',
										'lastname',
										'email',
									],
								},
							],
						},
						{
							model: Group,
							attributes: ['id', 'name'],
						},
					],
					where: _where,
					order: [[sort, order]],
					offset: (page - 1) * limit,
					limit,
				})
				.then((result) => {
					if (result) {
						console.log("result...",result);
						res.status(200).send({ count: total.count, rows: result });
					} else {
						res.status(404).send({ success: 0 });
			}
				})
				.catch((err) => {
					res.send({ error: err.original });
				});
			} else {
*/
  Transaction.findAll({
    include: [
      {
        model: TransactionLineItem,
        attributes: ["id", "item_id", "quantity", "price", "net_amount"],
        include: [
          {
            model: Item,
            attributes: ["name", "item_type", "media_type", "cover"],
          },
        ],
      },
      {
        model: TransactionPeople,
        where: _people_where,
        attributes: ["id", "transaction_id", "distributor_id", "other_distributor_id"],
        include: [
          {
            model: People,
            attributes: [
              "preferred_name",
              "firstname",
              "middle_name",
              "lastname",
              "email",
            ],
          },
        ],
      },
      {
        model: Group,
        attributes: ["id", "name"],
      },
    ],
    where: _where,
  })
    .then((result) => {
      if (result) {
        // adding bookname and groupname to result as direct properties
        result = result.map(function (x) {
          x.dataValues.title = null;
          x.dataValues.group_name = null;
          let data = x.dataValues;
          let lineItem = null;
          if (
            data.transaction_line_items != null &&
            data.transaction_line_items.length > 0 &&
            data.transaction_line_items[0].dataValues.item
          ) {
            lineItem =
              data.transaction_line_items[0].dataValues.item.dataValues;
            x.dataValues.title = lineItem.name;
          }
          let group = null;
          if (data.group != null) {
            group = data.group.dataValues;
            x.dataValues.group_name = group.name;
          }
          let amount=0;
         
          data.transaction_line_items.map(function (item) {
           // console.log('data', item.dataValues.price)
            amount+= +moneyToNumber(item.dataValues.price);
          });
          x.dataValues.transaction_amount= amount;
          if(x.dataValues.total_amount !== null)
          {
          x.dataValues.total_amount= x.dataValues.total_amount;
          }
          else {
          x.dataValues.total_amount= amount;
          }
        //  console.log('am', x.dataValues.total_amount);
          // x.dataValues.transaction_amount=  data.transaction_line_items[0].dataValues.item * 
          return x;
        });
        // filtering now
        if (search !== "null") {
          result = result.filter(function (data) {
            let ok =
              (data != null &&
                data.transaction_book_points != null &&
                data.transaction_book_points.toString().includes(search)) ||
              (data != null &&
                data.people_first_name != null &&
                data.people_first_name
                  .toLowerCase()
                  .includes(search.toLowerCase())) ||
              (data != null &&
                data.dataValues.title != null &&
                data.dataValues.title
                  .toLowerCase()
                  .includes(search.toLowerCase())) ||
              (data != null &&
                data.dataValues.group_name != null &&
                data.dataValues.group_name
                  .toLowerCase()
                  .includes(search.toLowerCase()));
                  let amount=0;
           data.transaction_line_items.map(function (item) {
            amount+= +moneyToNumber(item.dataValues.price) * item.dataValues.quantity;
          });
          
          x.dataValues.transaction_amount=amount;    
            return ok;
          });
        }
        let totalcount = result.length;
        //sorting tbd
        if (sort) {
          result = result.sort(dynamicSort(sort, order));
        }
        let offset = (page - 1) * limit;
        let retresult = result.slice(
          offset,
          Math.min(result.length, Number(offset) + Number(limit))
        );
        res.status(200).send({ count: totalcount, rows: retresult });
      } else {
        //console.log("ERROR NO result count = ");
        res.status(200).send({ count: 0, rows: [] });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
  /*
		})
		.catch((err) => {
			res.send({ error: err.original });
		});
				*/
});

function dynamicSort(property, order = "asc", flag) {
  var sortOrder = 1;
  if (order == "desc") {
    sortOrder = -1;
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result =
      a.dataValues[property] < b.dataValues[property]
        ? -1
        : a.dataValues[property] > b.dataValues[property]
        ? 1
        : 0;
    return result * sortOrder;
  };
}

router.get("/book-distribution/:id", function (req, res) {
  const { id } = req.params;
  Transaction.findOne({
    where: { id: id },
    include: [
      {
        model: TransactionLineItem,
        attributes: ["id", "item_id", "quantity", "price", "net_amount"],
        include: [
          {
            model: Item,
            attributes: ["name", "item_type", "media_type", "cover", "bbt_book_points"],
          },
        ],
      },
      {
        model: TransactionPeople,
        attributes: ["id", "transaction_id", "distributor_id", "other_distributor_id"],
        include: [
          {
            model: People,
            attributes: [
              "preferred_name",
              "firstname",
              "middle_name",
              "lastname",
              "email"
            ],
          },
        ],
      },
    ],
  })
    .then(async (result) => {
      let peopleResult = []
      if(result["dataValues"].people_email !== undefined)
      {
       peopleResult = await People.findOne({ where: { email: result["dataValues"].people_email } });
      }
      if (result) {
        result = {
          data : result,
          persons : peopleResult
        }
       // console.log('res is', result);
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

router.get('/check-people-email', async function (req, res) {
  const { email } = req.query;
    let response =  await People.findOne({ where: { email: email } });
    if(response !== null){
      res.status(200).send(response);
    }
    else {
      console.log('m here');
      res.status(420).send({ success: 0 });
    }
})

router.post("/book-distribution", function (req, res) {
  const upload = multer({ storage: storage, fileFilter: imageFilter }).array(
    "photos",
    12
  );
  upload(req, res, function (err) {
    if (err) {
      console.log("Error:", err);
    }
    let itemData = JSON.parse(req.body.formFields);
    
    const transaction_book_points_arr = itemData.bbt_point.map(
      (point, indx) => point * +itemData.quantity[indx]
    );
  
    const transaction_amount = getArrayValueSum(itemData.amount);
    const transaction_book_points = getArrayValueSum(
      transaction_book_points_arr
    );
    const userId = JSON.parse(req.body.userId);
    itemData = {
      ...itemData,
      transaction_amount,
      transaction_book_points,
      created_by_id: userId,
      last_modified_by_id: userId,
    };
    itemData.selected.map((sel, key) => {
       req.files[key].selected = sel
    });

    if (typeof req.files !== "undefined") {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
       let photos = []
       req.files.map((file, key) => {
         photos.push({photoUrl : file.path, selected : file.selected})
      });
      itemData = { ...itemData, photos2: photos};
    }
    Transaction.create(itemData)
    .then((result) => {
      if (result) {
        const transaction_id = result.id;
        // Add People
        let people = {
          firstname: itemData.people_first_name,
          lastname: itemData.people_last_name,
          email: itemData.people_email,
          created_by_id: result.created_by_id,
          last_modified_by_id: result.last_modified_by_id,
          organization_id: result.organization_id,
        };
        if (typeof itemData.people_mobile !== "undefined") {
          people = {
            ...people,
            mobile: itemData.people_mobile,
            phone: itemData.people_mobile,
          };
        }

        if (typeof itemData.people_gender !== "undefined") {
          people = { ...people, gender: itemData.people_gender };
        }
        if (typeof itemData.book_names !== "undefined" && typeof itemData.distributors !== "undefined" && typeof itemData.net_amount !== "undefined" &&  typeof itemData.people_initiation_level !== undefined) {
        let bookpurchased = []
        for(let book in itemData.book_names){
          bookpurchased.push(itemData.book_names[book].name)
        }
        people = {...people, notes : JSON.stringify({'referred_by' : itemData.distributors.toString(), 'money_donated' : itemData.net_amount, 'books_purchased' : bookpurchased.toString(), 'initiation_level' : itemData.people_initiation_level })}
      }
        addPeopleAndUpdateDistributor(people, transaction_id);
       // Add or Update Transaction Line Items
        if (itemData.item.length) {
          const organization_id = result.organization_id;
          itemData.item.map((itm, row) => {
            if (+itemData.quantity[row] > 0) {
              addUpdateTransactionLineItem(
                {
                  transaction_id,
                  item_id: itm,
                  quantity: itemData.quantity[row],
                  price: itemData.isTotalAmount ? itemData.total_amount : itemData.amount[row],
                  net_amount : itemData.net_amount,
                  transaction_book_points: itemData.bbt_point[row],
                  organization_id,
                },
                { transaction_id, item_id: itm }
              );
            }
          });
        }
        // Add or Update Transaction Peoples
        if (
          typeof itemData.distributors !== "undefined" &&
          itemData.distributors.length
        ) {
          itemData.distributors.map((dist) => {
            let distributor_id=dist.id;
            let distributor_index=dist.index;
            addUpdateTransactionPeople(
              {
                transaction_id,
                distributor_id,
                distributor_index,
              },
              { transaction_id, distributor_id,distributor_index }
            );
          });
        }
        if (
          typeof itemData.other_distributor_ids !== "undefined" &&
          itemData.distributor_ids.length
        ) {
          itemData.other_distributor_ids.map((other_distributor_id) => {
            addUpdateTransactionPeople(
              {
                transaction_id,
                other_distributor_id,
                distributor_index:null,
              },
              { transaction_id, other_distributor_id,distributor_index:null }
            );
          });
        }
       // sending mail
        findOrganization(itemData.organization_id, itemData);
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
  });
});
// const findOrganization = async (org_id, itemData) => {
//   const result  = await Organization.findOne({ where: { id : org_id} })
//   //  console.log('res is', itemData);
//   if(result["dataValues"].distribution_list_email !== undefined && result["dataValues"].email_book_distribution_entry !== undefined) {
//     console.log('reached inside', result["dataValues"].distribution_list_email, result["dataValues"].email_book_distribution_entry)
//     if(result["dataValues"].email_book_distribution_entry == true && result["dataValues"].distribution_list_email !== null)
//     {
//       // console.log('reached inside2')
//      sendEmail(itemData, result["dataValues"].distribution_list_email)
//     }
//   }
// }
router.patch("/book-distribution/:id", async function (req, res) {
  const { id } = req.params;
  const upload = multer({ storage: storage, fileFilter: imageFilter }).array(
    "photos",
    12
  );
  upload(req, res, async function (err) {
    if (err) {
      console.log("Error:", err);
    }
    let itemData = JSON.parse(req.body.formFields);
    const transaction_book_points_arr = itemData.bbt_point.map(
      (point, indx) => point * +itemData.quantity[indx]
    );
    const userId = JSON.parse(req.body.userId);
    const transaction_amount = getArrayValueSum(itemData.amount);
    const transaction_book_points = getArrayValueSum(
      transaction_book_points_arr
    );
    itemData = {
      ...itemData,
      transaction_amount,
      transaction_book_points,
      created_by_id: userId,
      last_modified_by_id: userId,
    };
   // console.log('ssss', itemData)
//     itemData.selected.map((sel, key) => {
//       req.files[key].selected = sel
// });
    if (typeof req.files !== "undefined" && req.files.length > 0) {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
      // let photos = "{";
      // req.files.map((file, key) => {
      //   if (key !== 0) {
      //     photos += ",";
      //   }
      //   photos += file.path;
      // });
      // photos += "}";
      let photos = [];
      req.files.map((file, key) => {
        photos.push({photoUrl : file.path, selected : file.selected})
     });
       itemData = { ...itemData, photos2: photos};
    }
    else {
      var transactionData = await getTransactionYear(id);
   // console.log('insidedata', transactionData);
      let t = getR(itemData.selected, transactionData.dataValues.photos2)
         itemData = { ...itemData, photos2: t };
    }
    // return false;
    Transaction.update(itemData, { where: { id: id } })
      .then((result) => {
        if (result) {
          const transaction_id = id;
          // Add People
          let people = {
            firstname: itemData.people_firstname,
            lastname: itemData.people_lastname,
            email: itemData.people_email,
            created_by_id: result.created_by_id,
            last_modified_by_id: result.last_modified_by_id,
            organization_id: result.organization_id,
          };
          if (typeof itemData.people_mobile !== "undefined") {
            people = {
              ...people,
              mobile: itemData.people_mobile,
              phone: itemData.people_mobile,
            };
          }

          if (typeof itemData.people_gender !== "undefined") {
            people = { ...people, gender: itemData.people_gender };
          }
          if (typeof itemData.book_names !== "undefined" && typeof itemData.distributors !== "undefined" && typeof itemData.net_amount !== "undefined" &&  typeof itemData.people_initiation_level !== undefined) {
            let bookpurchased = []
            for(let book in itemData.book_names){
              bookpurchased.push(itemData.book_names[book].name)
            }
            people = {...people, notes : JSON.stringify({'referred_by' : itemData.distributors.toString(), 'money_donated' : itemData.net_amount, 'books_purchased' : bookpurchased.toString(), 'initiation_level' : itemData.people_initiation_level })}
          }
          addPeopleAndUpdateDistributor(people, transaction_id);
          if (
            typeof itemData.old_add_books !== "undefined" &&
            itemData.old_add_books.length > 0
          ) {
            itemData.old_add_books.map((book_id) => {
              if (!itemData.item.includes(book_id)) {
                removeTransactionLineItem(book_id, transaction_id);
              }
            });
          }

          if (
            typeof itemData.old_distributor_ids !== "undefined" &&
            itemData.old_distributor_ids.length > 0
          ) {
            itemData.old_distributor_ids.map((dist_id) => {
              if (!itemData.distributor_ids.includes(dist_id)) {
                removeTransactionPeople(dist_id, transaction_id);
              }
            });
          }
          // Add or Update Transaction Line Items
          if (itemData.item.length) {
            let net_amount = '';
            // if(itemData.isTotalAmount){
            //   net_amount = itemData.net_amount
            // }
            const organization_id = result.organization_id;
            itemData.item.map((itm, row) => {
              if (+itemData.quantity[row] > 0) {
                addUpdateTransactionLineItem(
                  {
                    transaction_id,
                    item_id: itm,
                    quantity: itemData.quantity[row],
                    price: itemData.amount[row],
                    transaction_book_points: itemData.bbt_point[row],
                    organization_id,
                  },
                  { transaction_id, item_id: itm }
                );
              }
            });
          }
          // Add or Update Transaction Peoples
          if (
            typeof itemData.distributor_ids !== "undefined" &&
            itemData.distributor_ids.length
          ) {
            itemData.distributor_ids.map((distributor_id) => {
              addUpdateTransactionPeople(
                {
                  transaction_id,
                  distributor_id,
                },
                { transaction_id, distributor_id }
              );
            });
          }
          res.status(200).send(result);
        } else {
          res.status(404).send({ success: 0 });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(503).send({ error: err.original });
      });
  });
  
});

getR = (arr, selected) => {
   let array = []
     arr.map(function(users, index) {
  // console.log('users1', index)
      selected.map(function(data, index2) {
      let d = JSON.parse(data)
   //   console.log('users2', index2);
      if (index == index2)
      {
      array.push({photoUrl : d.photoUrl, selected : users})
      }
      
      
      // if (user.id === target.id) {
      //   return target;
      // } else {
      //   return user;
      // }
   });
  });
  // console.log('arr', array)
  return  array
  
  // return transactionData

}
router.delete("/book-distribution/:id", async function (req, res) {
  const { id } = req.params;
  await TransactionLineItem.destroy({ where: { transaction_id: id } })
    .then((result) => result)
    .catch((error) => {
      console.log(error);
    });
  await TransactionPeople.destroy({ where: { transaction_id: id } })
    .then((result) => result)
    .catch((error) => {
      console.log(error);
    });
  Transaction.destroy({ where: { id: id } })
    .then((result) => {
      res
        .status(200)
        .send({ message: "Book distribution deleted successfully!" });
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

addPeopleAndUpdateDistributor = (people, transaction_id) => {
 
  People.findOne({ where: { email: people.email } }).then((result) => {
    if (result) {
      const distributor_id = result.id;
      People.update(people, { where: { id: distributor_id } });
      // addUpdateTransactionPeople(
      // 	{ transaction_id, distributor_id },
      // 	{ transaction_id, distributor_id }
      // );
    } else {
      People.create(people)
        .then((result) => {
          if (result) {
            const distributor_id = result.id;
            // addUpdateTransactionPeople(
            // 	{ transaction_id, distributor_id },
            // 	{ transaction_id, distributor_id }
            // );
          }
        })
        .catch((err) => {
          console.log("Error: ", err);
        });
    }
  });
};

addUpdateTransactionLineItem = (value, condition) => {
  TransactionLineItem.findOne({ where: condition }).then((result) => {
    if (result) {
      TransactionLineItem.update(value, { where: { id: result.id } });
    } else {
      TransactionLineItem.create(value);
    }
  });
};

addUpdateTransactionPeople = (value, condition) => {
  TransactionPeople.findOne({ where: condition }).then((result) => {
    if (result) {
   //   console.log("Already Exists");
      // TransactionLineItem.update(value, { where: condition });
    } else {
      TransactionPeople.create(value);
    }
  });
};

removeTransactionLineItem = (book_id, transaction_id) => {
  TransactionLineItem.destroy({ where: { transaction_id, item_id: book_id } });
};

removeTransactionPeople = (dist_id, transaction_id) => {
  TransactionPeople.destroy({
    where: { transaction_id, distributor_id: dist_id },
  });
};

const findOrganization = async (org_id, itemData) => {
  const result  = await Organization.findOne({ where: { id : org_id} })
  //  console.log('res is', itemData);
  if(result["dataValues"].distribution_list_email !== undefined && result["dataValues"].email_book_distribution_entry !== undefined) {
    if(result["dataValues"].email_book_distribution_entry == true && result["dataValues"].distribution_list_email !== null)
    {
      // console.log('reached inside2')
     sendEmail(itemData, result["dataValues"].distribution_list_email)
    }
  }
}

const sendEmail = async  (data, email) => {
  //const sendmail = require('sendmail')();

//  return false;
 // console.log('receiveremail', email);
  let user = ''
  let password = ''
  let host = ''
  //change this ids for local/live
  const settings = await Setting.findAll({ where: {
    id: {
      [Sq.Op.in]: [34,35,36],
    },
  } });
  for(let setting in settings){
    if(settings[setting].id == 34){
      user = settings[setting].value
    }
    else if (settings[setting].id == 35){
      password = settings[setting].value
    }
    else {
      host = settings[setting].value
    }
  }
 // console.log('user', user, password, host)
   password = cryptr.decrypt(password);
 // console.log('user2',  password2)
  var nodemailer = require('nodemailer');
  var transporter = nodemailer.createTransport({
    service: host,
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: password
    }
  });
  var d = new Date();
  tableData = (data) => {
  var html = "<table border='1|1' style='border-collapse:collapse;width: 500px;margin: 0 0 15px 0;'>";
  html+="<td style='padding: 5px;font-weight:bold;text-align:center;'>Title</td>";
  html+="<td style='padding: 5px;font-weight:bold;text-align:center;'>Number Of Books</td>";
  for (var i = 0; i < data.book_names.length; i++) {
      html+="<tr>";
      html+="<td style='padding: 5px;'>"+data.book_names[i].name+"</td>";
      html+="<td style='padding: 5px;'>"+data.book_names[i].qty+"</td>";
      html+="</tr>";
}
  html+="</table>";
  return html
}

returnData = () => {
  if(data.distribution_type == 'DETAILED')
  {
  var html = `<span style=padding:0 0 0 10px> ${data.location_address}, ${data.location_address2}</span>`
  html+=`<span style="padding:0 0 0 165px;display: block;">City : ${data.location_city},${data.location_state}, ${data.location_country} </span>`
}
else {
  var html = `<span style=padding:0 0 0 10px> ${data.location_address}</span>`
}
return html
}
  var mailOptions = {
    from: `No Reply <${user}>`,
    to: email,
    subject: 'Sankirtan Book Distribution',
    html: `
    <div class="mail-content">
    <div style=" margin:0 0 15px 0;font-weight:normal">
        <span style="font-weight:bold;min-width: 150px; display: inline-block;">Location </span>: 
        ${returnData(data)}
      </div>
      <div style=" margin:0 0 15px 0;font-weight:normal">
        <span style="font-weight:bold;min-width: 150px; display: inline-block;">Date </span>: 
        <span style="padding:0 0 0 10px;">${moment(data.date).format('LL')}</span>
      </div>
      <div style="margin:0 0 15px 0;font-weight:normal">
      <span style="font-weight:bold;min-width: 150px;display: inline-block;">Team</span>:
      <span style="padding:0 0 0 10px;display: inline-block;"> ${data.team}</span>
      </div>
      <div style="margin:0 0 15px 0;font-weight:normal">
          <span style="font-weight:bold;min-width: 150px;display: inline-block;">MSF Year</span>:
          <span style="padding:0 0 0 10px;display: inline-block;"> ${d.getFullYear()}</span>
      </div>
      <div style="margin:0 0 15px 0;font-weight:normal;">
         <span style="font-weight:bold;min-width: 150px;display: inline-block; text-decoration: none;"> Reported By </span>: 
         <span style="padding:0 0 0 10px;display: inline-block;">  ${data.people_email} </span>
      </div>
      <div style="margin:0 0 15px 0;font-weight:normal">
         <span style="font-weight:bold;min-width: 150px;display: inline-block;">Book Points </span>:
         <span style="padding:0 0 0 10px;display: inline-block;"> ${data.transaction_book_points} </span>
      </div>
     
       <div style="margin:0 0 15px 0;">
       <span style="font-weight:bold; margin:0 0 10px 0;display: block;">Book Score:</span>
       <div class=""> ${tableData(data)}</div>
       </div>
       <div style="margin:0 0 15px 0;font-weight:normal">
         <span style="font-weight:bold;display:block; letter-spacing:normal; margin:0 0 15px 0 ;">Laxmi Collected:</span> 
        <span style="display: block;"> US Dollar : ${data.net_amount} </span>        
      </div>
      <div style="margin:0 0 15px 0;font-weight:normal">
        <span style="font-weight:bold;display:block; letter-spacing:normal; margin:0 0 15px 0 ;">Devotees Particpated: </span>
        <span style="display: block;"> ${data.distributors.toString()} </span>
      </div>
      <div style="font-weight:normal;margin:0 0 15px 0; letter-spacing:1px;">
        <span style="font-weight:bold;display:block; letter-spacing:normal; margin:0 0 15px 0 ;"> GNAB:</span> 
        <span style="display: block;"> ${data.gnab} </span>
        </div>
        <div style="font-weight:normal; letter-spacing:1px;margin:0 0 15px 0;">
        <span style="font-weight:bold;display:block; letter-spacing:normal; margin:0 0 15px 0 ;"> Comments:</span> 
        <span style="display: block;"> ${data.comments} </span>
        </div>
        <div style="margin:0 0 5px 0;">--</div>
          <span style="display:block; font-size:12px;"> You received this message because you are subscribed to Sankirtan group.</span> 
          <span style="display: block;font-size:12px;"> To unsubscribe from this group and stop receiving emails from it send an email to isvsaiskcon@gmail.com </span>
        </div>
    </div>
    `
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('error', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}
// End Manage Book Distribution

//  CSV Import Book Distribution
validateRow = async (file_path) => {
  const field_rules = {
    Date: {
      required: true,
    },
    Group: {
      required: true,
    },
    "First Name": {
      required: true,
    },
    "Last Name": {
      required: true,
    },
    "Email Address": {
      required: true,
    },
    "Address Type": {
      is_null: true,
    },
    "Community Type": {
      is_null: true,
    },
    Coverage: {
      is_null: true,
    },
  };
  return new Promise(function (resolve, reject) {
    const bulk_data = [];
    fs.createReadStream(file_path)
      .pipe(csv())
      .on("data", (row) => {
        for (let field in field_rules) {
          const value = row[field];
          if (field_rules[field].required) {
            if (value == null || value.trim() === "") {
              resolve({
                success: 0,
                message: "The field " + field + " is required.",
              });
            }
          }
          if (
            typeof field_rules[field].email !== "undefined" &&
            field_rules[field].email
          ) {
            const is_email = value.match(
              /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i
            );
            if (!is_email) {
              resolve({
                success: 0,
                message: "The field " + field + " should be an email.",
              });
            }
          }
          if (field_rules[field].is_null) {
            if (value == null || value.trim() === "") {
              delete row[field];
            }
          }
        }
        bulk_data.push(row);
      })
      .on("end", () => {
        resolve({ success: 1, bulk_data });
      });
  });
};

// this ideally should be setup as a cron job
//reads pending files from batch_upload, generates an error csv file with invalid records and inserts the cporrect records
router.get("/import-book-distribution", function (req, res) {
  const { org_id } = req.query;
  const csv_fields_map = {
    Date: "date",
    Quantity: "quantity",
    Amount: "amount",
    Books: "item",
    "Email Address": "people_email",
    "First Name": "people_first_name",
    "Last Name": "people_last_name",
    Mobile: "people_mobile",
    Gender: "people_gender",
    Group: "transaction_group_id",
    Distributors: "distributor_ids",
    "Location Name": "location_name",
    Address: "location_address",
    Address2 : "location_address2",
    City: "location_city",
    State: "location_state",
    Zip: "location_zip",
    Country: "location_country",
    "Address Type": "location_address_type",
    "Community Type": "location_community_type",
    Coverage: "location_coverage",
    Comment: "comments",
    GNAB: "gnab",
    UnitOfMeasure: "unit_of_measure",
    BookPoints : "transaction_book_points",
    TotalAmount : "net_amount",
    BookNames: "book_names",
    DistributorNames : "distributor_names",
    PeopleInitiationLevel : "people_initiation_level"
  };
  const csvData = [];
  var csvHeader = [
    { id: "date", title: "Date" },
    { id: "quantity", title: "Quantity" },
    { id: "amount", title: "Amount" },
    { id: "item", title: "Books" },
    { id: "people_email", title: "Email Address" },
    { id: "people_first_name", title: "First Name" },
    { id: "people_last_name", title: "Last Name" },
    { id: "people_mobile", title: "Mobile" },
    { id: "people_gender", title: "Gender" },
    { id: "transaction_group_id", title: "Group" },
    { id: "distributor_ids", title: "Distributors" },
    { id: "location_name", title: "Location Name" },
    { id: "location_address", title: "Address" },
    { id: "location_city", title: "City" },
    { id: "location_state", title: "State" },
    { id: "location_zip", title: "Zip" },
    { id: "location_country", title: "Country" },
    { id: "location_address_type", title: "Address Type" },
    { id: "location_community_type", title: "Community Type" },
    { id: "location_coverage", title: "Coverage" },
    { id: "comments", title: "Comment" },
    { id: "gnab", title: "GNAB" },
    { id: "error", title: "error" },
  ];
  var csvFaildData = [];
  var csvSuccessData = [];
  var uploadBatchData = {};
  var batch_id = null;
  uploadBatchData.start_time = getCurrentDateTime();
  UploadBatch.findAll({
    where: {
      status: "Pending",
    },
  }).then(async (uploadedBatch) => {
    
    Item.findAll().then((books) => {
      uploadedBatch.map(async (batchData, batchindex) => {
        // output_filename is the unique filename generated for input csv file
        try {
          let path = `public/CSV/${batchData.output_filename}`;
          console.log('path');
          if (fs.existsSync(path)) {
            const is_valid = await validateRow(path);
            if (is_valid.success) {
              uploadBatchData.total_records = is_valid.bulk_data.length;
              is_valid.bulk_data.map(async (data, index) => {
                let row = {};
                for (let key in data) {
                    if(key == "PeopleInitiationLevel")
                    {
                      row["people_initiation_level"] = data[key];
                    }
                    else {
                    row[csv_fields_map[key]] = data[key];
                    }
                }
                row.item = row.item.replace(/,]/g, "]");
                row.quantity = row.quantity.replace(/,]/g, "]");
                row.amount = row.amount.replace(/,]/g, "]");
                row.distributor_ids = row.distributor_ids.replace(/,]/g, "]");
                row.distributor_ids = row.distributor_ids.replace(/,]/g, "]");

                const item = JSON.parse(row.item);
                const distributors = JSON.parse(row.distributor_ids);
                const quantity = JSON.parse(row.quantity);
                const amount = JSON.parse(row.amount);
                let transaction_book_point = [];
                let isValidBookId = true;
                if (item.length > 0) {
                  item.map((item_id, indx) => {
                    let bookCount = this.getBBTPoints(item_id, books);
                    if (bookCount == -1) {
                      // -1 if no book id
                      isValidBookId = false;
                    } else {
                      bookCount = bookCount * +quantity[indx];
                      transaction_book_point.push(bookCount);
                    }
                  });
                }
                const fieldsToAppend = this.fieldsToAppend(
                  JSON.parse(batchData.user_info)
                );
                const itemData = {
                  ...row,
                  ...fieldsToAppend,
                  transaction_book_points: this.getArrayValueSum(
                    transaction_book_point
                  ),
                  transaction_amount: this.getArrayValueSum(amount),
                  batch_id: batchData.batch_id,
                };
               
                var emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
                var phoneReg = /^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$/;
                var quantityReg = /^\[\d+(?:,\d+)*]$/;
                var onlyNumberValue = /^\d+$/;
                var checkPercent = /[0-9]*\.?[0-9]+%/;

                var bulk_error = [];
                var isVaildRecord = true;
                if (!emailReg.test(itemData.people_email)) {
                  let tr_error = "Invalid Email";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (!checkPercent.test(itemData.location_coverage)) {
                  let tr_error = "Invalid Coverage";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }
                // console.log(itemData.location_coverage);
                // console.log(itemData);
                // itemData.location_coverage = +itemData.location_coverage;
                // console.log(itemData);
                // return false;

                let totalBooks = item.length;
                if (
                  totalBooks != quantity.length ||
                  totalBooks != amount.length
                ) {
                  let tr_error =
                    "Books, Quantity and Amount Fields should be correspondence";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (itemData.transaction_group_id == 1) {
                  let tr_error =
                    "You can't choose Group ID(1) because this is a global group";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                } else if (itemData.transaction_group_id != 1) {
                  await Group.findOne({
                    where: { id: itemData.transaction_group_id },
                  })
                    .then((groupId) => {
                      //console.log("groupId===",groupId);
                      if (groupId == null || groupId == "") {
                        let tr_error = `Invalid group id ${itemData.transaction_group_id}`;
                        bulk_error.push(tr_error);
                        isVaildRecord = false;
                      }
                    })
                    .catch((error) => {
                      let tr_error = `Invalid group id ${itemData.transaction_group_id}`;
                      bulk_error.push(tr_error);
                      isVaildRecord = false;
                    });
                }
                let peopleNames = []
                let bookNames = []
               await People.findAll({
                  where: {
                    id: {
                      [Sq.Op.in]: distributors,
                    },
                  },
                })
                  .then((distributor) => {
                    peopleNames = distributor
                    if (
                      distributor.length == 0 ||
                      distributor.length != distributors.length
                    ) {
                      let tr_error = `Invalid Distributor ids `;
                      bulk_error.push(tr_error);
                      isVaildRecord = false;
                    }
                  })
                  .catch((error) => {
                    let tr_error = `Invalid Distributor id ${distributor_id}`;
                    bulk_error.push(tr_error);
                    isVaildRecord = false;
                  });
                  await Item.findAll({
                    where: {
                      id: {
                        [Sq.Op.in]: item,
                      },
                    },
                  })
                    .then((books) => {
                     bookNames = books
                    })
                    .catch((error) => {
                    });
                  let book_names = []
                  let distributor_names = []
                  for(let i in peopleNames) {
                   distributor_names.push(peopleNames[i]['dataValues'].firstname + peopleNames[i]['dataValues'].lastname)
                  }
                  for(let i in bookNames) {
                    book_names.push({name : bookNames[i]['dataValues'].name, qty : quantity[i] })
                  }
                  let emailData = {
                    ...itemData,
                    book_names,
                    distributors :  distributor_names
                  }
                  findOrganization(org_id, emailData)
                  // if(distribution_list_email !== undefined && email_book_distribution_entry !== undefined) {
                  //      if(email_book_distribution_entry == 'true' && distribution_list_email !== null)
                  //      {
                  //     sendEmail(emailData, distribution_list_email)
                  //      }
                  //    }
                   
                if (!phoneReg.test(itemData.people_mobile)) {
                  let tr_error = "Invalid phone";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (!onlyNumberValue.test(itemData.location_zip)) {
                  let tr_error = "Invalid Zip code";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (!quantityReg.test(itemData.quantity)) {
                  let tr_error = "Invalid quantity";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }
                
                if (moment(itemData.date, "M/D/YYYY", true).isValid() == true) {
                  itemData.date = moment(itemData.date, "M/D/YYYY").format(
                    "YYYY-MM-DD"
                  );
                } else if (
                  moment(itemData.date, "M-D-YYYY", true).isValid() == true
                ) {
                  itemData.date = moment(itemData.date, "M-D-YYYY").format(
                    "YYYY-MM-DD"
                  );
                } else if (
                  moment(itemData.date, "D-M-YYYY", true).isValid() == true
                ) {
                  itemData.date = moment(itemData.date, "D-M-YYYY").format(
                    "YYYY-MM-DD"
                  );
                } else if (
                  moment(itemData.date, "D/M/YYYY", true).isValid() == true
                ) {
                  itemData.date = moment(itemData.date, "D/M/YYYY").format(
                    "YYYY-MM-DD"
                  );
                } else if (
                  moment(itemData.date, "YYYY/MM/DD", true).isValid() == true
                ) {
                  itemData.date = moment(itemData.date, "YYYY/MM/DD").format(
                    "YYYY-MM-DD"
                  );
                } else if (
                  moment(itemData.date, "YYYY-MM-DD", true).isValid() == true
                ) {
                  itemData.date = moment(itemData.date, "YYYY-MM-DD").format(
                    "YYYY-MM-DD"
                  );
                } else {
                  let tr_error = "Invalid Date";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }
                if (
                  itemData.people_first_name == null ||
                  itemData.people_first_name == ""
                ) {
                  let tr_error = "First is required";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (
                  itemData.people_email == null ||
                  itemData.people_email == ""
                ) {
                  let tr_error = "Email is required";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                let tr_item = itemData.item;
                if (
                  (tr_item.includes("[") && tr_item.includes("]")) == false ||
                  tr_item == "" ||
                  !isValidBookId
                ) {
                  let tr_error = "Invalid Book ID";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }
                let tr_quantity = itemData.quantity;

                if (
                  (tr_quantity.includes("[") && tr_quantity.includes("]")) ==
                    false ||
                  tr_quantity == ""
                ) {
                  let tr_error = "Invalid quantity";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                let tr_distributor_ids = itemData.distributor_ids;
                if (
                  (tr_distributor_ids.includes("[") &&
                    tr_distributor_ids.includes("]")) == false ||
                  tr_distributor_ids == ""
                ) {
                  let tr_error = "Invalid distributors";
                  bulk_error.push(tr_error);
                  isVaildRecord = false;
                }

                if (bulk_error && isVaildRecord == false) {
                  let csvErrors = "";
                  csvErrors = bulk_error.toString();
                  itemData.error = csvErrors;
                  csvFaildData.push(itemData);
                }

                let totalAmount = 0
                let totalBookPoints = 0
                item.map((item_id, key) => {
                  totalAmount += amount[key]
                  totalBookPoints += this.getBBTPoints(
                    item_id,
                    books
                  )*quantity[key]
                })
                // if(totalAmount == row["net_amount"])
                // {
                //   console.log('entered');
                //   let tr_error = "Invalid Amount";
                //   bulk_error.push(tr_error);
                //   isVaildRecord = false;
                // }

                // Add Transaction Here
                // console.log('itemData', itemData);
                
                if (itemData.transaction_group_id > 1 && isVaildRecord) {
                  update_upload_batch(batchData.batch_id, "In Progress");
                  itemData.transasction_status = "Pending";
                  await Transaction.create(itemData)
                    .then(async (result) => {
                      if (result) {
                        csvSuccessData.push(itemData);
                        const transaction_id = result.id;
                        // Add People
                        let people = {
                          firstname: itemData.people_first_name,
                          lastname: itemData.people_last_name,
                          email: itemData.people_email,
                          created_by_id: result.created_by_id,
                          last_modified_by_id: result.last_modified_by_id,
                          organization_id: result.organization_id,
                        };
                        if (typeof itemData.people_mobile !== "undefined") {
                          people = {
                            ...people,
                            mobile: itemData.people_mobile,
                            phone: itemData.people_mobile,
                          };
                        }
                      //adding notes field
                        if (typeof emailData.book_names !== "undefined" && typeof emailData.distributors !== "undefined" && typeof emailData.net_amount !== "undefined") {
                          let bookpurchased = []
                          for(let book in emailData.book_names){
                            bookpurchased.push(emailData.book_names[book].name)
                          }
                          people = {...people, notes : JSON.stringify({'referred_by' : emailData.distributors.toString(), 'money_donated' : emailData.net_amount, 'books_purchased' : bookpurchased.toString(), 'initiation_level' :  emailData.people_initiation_level })}
                        }
                        if (typeof itemData.people_gender !== "undefined") {
                          people = {
                            ...people,
                            gender: itemData.people_gender,
                          };
                        }
                        if (people.organization_id != 1) {
                          this.addPeopleAndUpdateDistributor(
                            people,
                            transaction_id
                          );
                        }
                        // Add or Update Transaction Line Items
                        if (item.length > 0) {
                          
                          const organization_id = result.organization_id;
                          item.map((item_id, key) => {
                            if (+quantity[key] > 0) {
                              // Add Transaction Line Item Here
                              this.addUpdateTransactionLineItem(
                                {
                                  transaction_id,
                                  item_id,
                                  quantity: quantity[key],
                                  price: amount[key],
                                  net_amount : itemData.transaction_amount,
                                  unit_of_measure : row["unit_of_measure"],
                                  transaction_book_points: this.getBBTPoints(
                                    item_id,
                                    books
                                  ),
                                  organization_id,
                                },
                                { transaction_id, item_id }
                              );
                            }
                          });
                        
                        
                        }
                        
                        // Add or Update Transaction Peoples
                        
                        const distributor_ids = JSON.parse(row.distributor_ids);
                        if (distributor_ids.length > 0) {
                          distributor_ids.map((distributor_index,distributor_id) => {
                            this.addUpdateTransactionPeople(
                              {
                                transaction_id,
                                distributor_id,
                                distributor_index
                              },
                              { transaction_id, distributor_id,distributor_index }
                            );
                          });
                        }
                      } else {
                        csvFaildData.push(itemData);
                      }
                    })
                    .catch((err) => {
                      //csvFaildData.push(itemData);
                      console.log("error", err);
                    });
                }
                if (uploadBatchData.total_records == index + 1) {
                  update_upload_batch(batchData.batch_id, "Completed");
                }
              });
            } else {
              update_upload_batch(
                batchData.batch_id,
                `Failed`,
                is_valid.message
              );
            }
          } //file exists
          else {
            update_upload_batch(batchData.batch_id, "File not found");
          }
        } catch (err) {
          console.error(err);
          update_upload_batch(batchData.batch_id, "File not found");
        }
      });
    });
  });
  const update_upload_batch = function (batch_id, status, errorMsg = null) {
    //console.log("forupdate==",batch_id,status,csvFaildData.length,csvSuccessData.length);

    if (uploadBatchData.total_records) {
      uploadBatchData.success_records =
        uploadBatchData.total_records - csvFaildData.length;
      uploadBatchData.failed_records = csvFaildData.length;
    } else {
      uploadBatchData.failed_records = null;
      uploadBatchData.success_records = null;
    }

    uploadBatchData.end_time = getCurrentDateTime();
    uploadBatchData.status = status;
    uploadBatchData.errormsg = errorMsg;
    if (batch_id != null) {
      // console.log('uploadBatchData');
      // console.log(uploadBatchData);
      
      UploadBatch.update(uploadBatchData, {
        where: { batch_id: batch_id },
      })
        .then(async (result) => {
          if (result) {
            if (csvFaildData && csvFaildData.length && status == "Completed") {
              let csvFailedFileWriter = createCsvWriter({
                path: `public/CSV/bulk-${batch_id}-result.csv`,
                header: csvHeader,
              });
              csvFailedFileWriter
                .writeRecords(csvFaildData)
                .then(() =>
                  console.log("The CSV file was written successfully")
                );
            }
            return true;
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
  //to be uncommented when added to cron
  //	return res.send('cron run successfully done!');
});

router.get("/import-uploaded-batchs", function (req, res) {
  const { page, limit, id } = req.query;
  if (page && limit && id) {
    UploadBatch.findAll({
      order: [["batch_id", "DESC"]],
    })
      .then((result) => {
        var batchResult = [];
        result.map((batch) => {
          let user_info = JSON.parse(batch.user_info);
          if (id == user_info.user_id) {
            batchResult.push(batch);
          }
        });
        let offset = (page - 1) * limit;
        let retresult = batchResult.slice(
          offset,
          Math.min(batchResult.length, Number(offset) + Number(limit))
        );
        res.status(200).send({ count: batchResult.length, rows: retresult });
      })
      .catch((err) => {
        res.status(503).send({ error: err.original });
      });
  } else {
    res.status(404).send({ success: 0 });
  }
});

router.post("/bulk-book-distribution", function (req, res) {
  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/CSV/");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });
  const upload = multer({ storage: storage }).single("csv_file");
  upload(req, res, async function (err) {
    if (err) {
      // console.log("bulk-book-distribution Error IN UPLOADING FILE:", err);
    }
    
    if (typeof req.file !== "undefined") {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
    }
    const user_info = JSON.parse(req.body.user_info);
    //const books = JSON.parse(req.body.books);
    //console.log("books====",books);
    if (
      req.file.path != undefined &&
      req.file.filename != undefined &&
      req.file.originalname != undefined
    ) {
      var uploadBatchData = {};
      uploadBatchData.input_filename = Date.now() + "-" + req.file.originalname;
      uploadBatchData.output_filename = req.file.filename;
      uploadBatchData.batch_date = getCurrentDateTime();
      uploadBatchData.status = "Pending";
      uploadBatchData.user_info = JSON.stringify(user_info);
      console.log('uploadBatchData');
      console.log(uploadBatchData);
      UploadBatch.create(uploadBatchData).then(async (uploadbatchSuccess) => {
        if (uploadbatchSuccess) {
          res
            .status(200)
            .send({ success: 1, message: "CSV uploaded successfully!" });
        } else {
          res.status(404).send({ success: 0 });
        }
      });
    } else {
      res.status(404).send({ success: 0 });
    }
  });
});

formatCollection = (collectionData) => {
  let finalData = {};
  let success = 0;
  let laxmi_progress = 0;
  let point_progress = 0;
  if (collectionData.total_annual_book_points_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_book_points_goal:
        collectionData.total_annual_book_points_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_bbt_amount_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_bbt_amount_goal: collectionData.total_annual_bbt_amount_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_group_amount_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_group_amount_goal: collectionData.total_annual_group_amount_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_actual_book_points !== null) {
    finalData = {
      ...finalData,
      total_annual_actual_book_points:
        collectionData.total_annual_actual_book_points,
    };
    point_progress =
      typeof finalData.total_annual_book_points_goal === "undefined"
        ? 0
        : (collectionData.total_annual_actual_book_points * 100) /
          finalData.total_annual_book_points_goal;
    success = 1;
  }

  if (collectionData.total_annual_actual_bbt_amount !== null) {
    finalData = {
      ...finalData,
      total_annual_actual_bbt_amount:
        collectionData.total_annual_actual_bbt_amount,
    };
    success = 1;
    console.log(
      moneyToNumber(collectionData.total_annual_actual_bbt_amount),
      moneyToNumber(finalData.total_annual_bbt_amount_goal)
    );
    laxmi_progress =
      typeof finalData.total_annual_bbt_amount_goal === "undefined"
        ? 0
        : (moneyToNumber(collectionData.total_annual_actual_bbt_amount) * 100) /
          moneyToNumber(finalData.total_annual_bbt_amount_goal);
  }
  return {
    collection: {
      ...finalData,
      laxmi_progress: `${laxmi_progress}%`,
      point_progress: `${point_progress}%`,
    },
    success,
  };
};
router.get("/collection-by-param", async function (req, res) {
  let query_param = req.query;
  let laxmi_growth_per = 0;
  let book_points_growth_per = 0;
  let bbt_amount_this_year = 0;
  let book_points_this_year = 0;
  let bbt_amount_last_year = 0;
  let book_points_last_year = 0;
  const is_dashboard = query_param.is_dashboard;
  delete query_param.is_dashboard;
  let collection_for = {
    name: "ISKCON Global",
    picture: "img/iskcon-global.png",
  };
  if(query_param.period_id == 0){
    query_param = { ...query_param, period_id: null }; 
  }
  if(query_param.distributor_id === undefined || query_param.distributor_id == 0){
    query_param = { ...query_param, distributor_id: null }; 
  }
  if (query_param.group_id && query_param.group_id === "iskconGlobal") {
    const group = await Group.findOne({ where: { parent_group: null } })
      .then((result) => result)
      .catch((error) => {
        console.log(error);
        return [];
      });
    query_param.group_id = group.id;
    // delete query_param.group_id;
  } else if (query_param.group_id) {
    const group = await Group.findOne({
      attributes: ["name", "picture_url"],
      where: { id: query_param.group_id },
    })
      .then((result) => result)
      .catch((error) => []);
    collection_for = {
      ...collection_for,
      name: group.name,
      picture:
        group.picture_url === null ? "img/group_icon.png" : group.picture_url,
    };
  } else if (query_param.distributor_id) {
    const people = await People.findOne({
      attributes: ["firstname", "lastname", "picture_url"],
      where: { id: query_param.distributor_id },
    })
      .then((result) => result)
      .catch((error) => []);
    collection_for = {
      ...collection_for,
      name: [people.firstname, people.lastname].join(" "),
      picture:
        people.picture_url === null ? "img/user_icons.png" : people.picture_url,
    };
  }
  let growth = {};
  if (JSON.parse(is_dashboard)) {
    
    const thisYearGrowth = await getDashboardGrowth(query_param);
    growth = {
      ...growth,
      thisYearGrowth: {
        year: parseInt(query_param.year),
        data: thisYearGrowth,
      },
    };
    const lastYear = parseInt(query_param.year) - 1;
    const lastYearGrowth = await getDashboardGrowth({
      ...query_param,
      year: lastYear.toString(),
    });
    if(thisYearGrowth.length > 0)
    {
      console.log('gro', thisYearGrowth[0]['dataValues'], 'point', lastYearGrowth[0]['dataValues']);
      if(thisYearGrowth[0]['dataValues'] !== undefined &&  lastYearGrowth[0]['dataValues'] !== undefined)
      {
     
    // if(thisYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount'] !== null && thisYearGrowth[0]['dataValues']['total_annual_actual_book_points'] !== null && thisYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount'] !== undefined &&
    // thisYearGrowth[0]['dataValues']['total_annual_actual_book_points'] !== undefined && lastYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount'] !== null && lastYearGrowth[0]['dataValues']['total_annual_actual_book_points'] !== null && lastYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount'] !== undefined &&
    // lastYearGrowth[0]['dataValues']['total_annual_actual_book_points'] !== undefined){
      if(thisYearGrowth[0]['dataValues'] !== undefined)
      {
       bbt_amount_this_year=moneyToNumber(thisYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount']);
       book_points_this_year=thisYearGrowth[0]['dataValues']['total_annual_actual_book_points'];
      }
      if(thisYearGrowth[0]['dataValues'] !== undefined)
      {
       bbt_amount_last_year=moneyToNumber(lastYearGrowth[0]['dataValues']['total_annual_actual_bbt_amount']);
       book_points_last_year=lastYearGrowth[0]['dataValues']['total_annual_actual_book_points'];
      }
    laxmi_growth_per=((bbt_amount_this_year - bbt_amount_last_year) /  bbt_amount_last_year) * 100;
    book_points_growth_per=((book_points_this_year - book_points_last_year) /  book_points_last_year) * 100;

  //  }
  }
   }
   
    // moneyToNumber(growth[0].dataValues.total_annual_actual_bbt_amount)
    
  
    growth = {
      ...growth,
      book_points_growth_per,
      laxmi_growth_per,
      lastYearGrowth: {
        year: lastYear,
        data: lastYearGrowth,
      },
    };
  }
  
  BusinessPlanSummary.findAll({
    where: query_param,
    attributes: [
      [
        Sq.fn("sum", Sq.col("book_points_goal_total")),
        "total_annual_book_points_goal",
      ],
      [
        Sq.fn("sum", Sq.col("bbt_amount_goal_total")),
        "total_annual_bbt_amount_goal",
      ],
      [
        Sq.fn("sum", Sq.col("group_amount_goal_total")),
        "total_annual_group_amount_goal",
      ],
      [
        Sq.fn("sum", Sq.col("actual_book_points_total")),
        "total_annual_actual_book_points",
      ],
      [
        Sq.fn("sum", Sq.col("actual_bbt_amount_total")),
        "total_annual_actual_bbt_amount",
      ],
    ],
  })
    .then((result) => {
      if (result) {
        res.status(200).send({
          ...formatCollection(result[0].dataValues),
          collection_for,
          growth,
        });
      } else {
        res.status(400).send({ success: 0 });
      }
    })
    .catch((err) => {
      console.log("Error", err);
      res.status(503).send({ error: err.original });
    });
});

router.post("/old-bulk-book-distribution", function (req, res) {
  const csv_fields_map = {
    Date: "date",
    Quantity: "quantity",
    Amount: "amount",
    Books: "item",
    "Email Address": "people_email",
    "First Name": "people_first_name",
    "Last Name": "people_last_name",
    Mobile: "people_mobile",
    Gender: "people_gender",
    Group: "transaction_group_id",
    Distributors: "distributor_ids",
    "Location Name": "location_name",
    Address: "location_address",
    City: "location_city",
    State: "location_state",
    Zip: "location_zip",
    Country: "location_country",
    "Address Type": "location_address_type",
    "Community Type": "location_community_type",
    Coverage: "location_coverage",
    Status: "transasction_status",
    Comment: "comments",
    GNAB: "gnab"
  };
  const upload = multer({ dest: "tmp/csv/" }).single("csv_file");
  upload(req, res, async function (err) {
    if (err) {
      console.log("Error:", err);
    }

    if (typeof req.file !== "undefined") {
      if (req.fileValidationError) {
        return res.send({ success: 0, error: req.fileValidationError });
      } else if (err instanceof multer.MulterError) {
        return res.send({ success: 0, error: err });
      } else if (err) {
        return res.send({ success: 0, error: err });
      }
    }
    const user_info = JSON.parse(req.body.user_info);
    const books = JSON.parse(req.body.books);
    const is_valid = await validateRow(req.file.path);
    if (is_valid.success) {
      is_valid.bulk_data.map((data) => {
        let row = {};
        for (let key in data) {
          row[csv_fields_map[key]] = data[key];
        }
        const item = JSON.parse(row.item);
        const quantity = JSON.parse(row.quantity);
        const amount = JSON.parse(row.amount);
        let transaction_book_point = [];
        if (item.length > 0) {
          item.map((item_id) => {
            transaction_book_point.push(this.getBBTPoints(item_id, books));
          });
        }
        // getArrayValueSum
        const fieldsToAppend = this.fieldsToAppend(user_info);
        const itemData = {
          ...row,
          ...fieldsToAppend,
          transaction_book_points: this.getArrayValueSum(
            transaction_book_point
          ),
          transaction_amount: this.getArrayValueSum(amount),
        };
        // Add Transaction Here
        Transaction.create(itemData)
          .then((result) => {
            if (result) {
              const transaction_id = result.id;
              // Add People
              let people = {
                firstname: itemData.people_first_name,
                lastname: itemData.people_last_name,
                email: itemData.people_email,
                created_by_id: result.created_by_id,
                last_modified_by_id: result.last_modified_by_id,
                organization_id: result.organization_id,
              };
              if (typeof itemData.people_mobile !== "undefined") {
                people = {
                  ...people,
                  mobile: itemData.people_mobile,
                  phone: itemData.people_mobile,
                };
              }

              if (typeof itemData.people_gender !== "undefined") {
                people = { ...people, gender: itemData.people_gender };
              }
              this.addPeopleAndUpdateDistributor(people, transaction_id);

              // Add or Update Transaction Line Items
              if (item.length > 0) {
                const organization_id = result.organization_id;
                item.map((item_id, key) => {
                  if (+quantity[key] > 0) {
                    // Add Transaction Line Item Here
                    this.addUpdateTransactionLineItem(
                      {
                        transaction_id,
                        item_id,
                        quantity: quantity[key],
                        price: amount[key],
                        net_amount: quantity[key] * amount[key],
                        transaction_book_points: this.getBBTPoints(
                          item_id,
                          books
                        ),
                        organization_id,
                      },
                      { transaction_id, item_id }
                    );
                  }
                });
              }
              // Add or Update Transaction Peoples
              const distributor_ids = JSON.parse(row.distributor_ids);
              if (distributor_ids.length > 0) {
                distributor_ids.map((distributor_id) => {
                  this.addUpdateTransactionPeople(
                    {
                      transaction_id,
                      distributor_id,
                    },
                    { transaction_id, distributor_id }
                  );
                });
              }
            } else {
              res.status(404).send({ success: 0 });
            }
          })
          .catch((err) => {
            console.log(err);
            // res.status(503).send({ error: err.original });
          });
      });
      res
        .status(200)
        .send({ success: 1, message: "CSV imported successfully!" });
    } else {
      res.status(200).send(is_valid);
    }
  });
});

formatCollection = (collectionData) => {
  let finalData = {};
  let success = 0;
  let laxmi_progress = 0;
  let point_progress = 0;
  if (collectionData.total_annual_book_points_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_book_points_goal:
        collectionData.total_annual_book_points_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_bbt_amount_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_bbt_amount_goal: collectionData.total_annual_bbt_amount_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_group_amount_goal !== null) {
    finalData = {
      ...finalData,
      total_annual_group_amount_goal: collectionData.total_annual_group_amount_goal,
    };
    success = 1;
  }
  if (collectionData.total_annual_actual_book_points !== null) {
    finalData = {
      ...finalData,
      total_annual_actual_book_points:
        collectionData.total_annual_actual_book_points,
    };
    // console.log('actual', collectionData.total_annual_actual_book_points, 'goal', finalData.total_annual_book_points_goal)
    point_progress =
      typeof finalData.total_annual_book_points_goal === "undefined"
        ? 0
        : (collectionData.total_annual_actual_book_points * 100) /
          finalData.total_annual_book_points_goal;
    success = 1;
  }

  if (collectionData.total_annual_actual_bbt_amount !== null) {
    finalData = {
      ...finalData,
      total_annual_actual_bbt_amount:
        collectionData.total_annual_actual_bbt_amount,
    };
    success = 1;
    
    laxmi_progress =
      typeof finalData.total_annual_bbt_amount_goal === "undefined"
        ? 0
        : (moneyToNumber(collectionData.total_annual_actual_bbt_amount) * 100) /
          moneyToNumber(finalData.total_annual_group_amount_goal);
  }
  return {
    collection: {
      ...finalData,
      laxmi_progress: `${laxmi_progress}%`,
      point_progress: `${point_progress}%`,
    },
    success,
  };
};
router.get("/collection-by-param", async function (req, res) {
  // console.log('req', req.query);
  let query_param = req.query;
  const is_dashboard = query_param.is_dashboard;
  delete query_param.is_dashboard;
  let collection_for = {
    name: "ISKCON Global",
    picture: "img/iskcon-global.png",
  };
  if (query_param.group_id && query_param.group_id === "iskconGlobal") {
    const group = await Group.findOne({ where: { parent_group: null } })
      .then((result) => result)
      .catch((error) => {
        console.log(error);
        return [];
      });
    query_param.group_id = group.id;
    // delete query_param.group_id;
  } else if (query_param.group_id) {
    const group = await Group.findOne({
      attributes: ["name", "picture_url"],
      where: { id: query_param.group_id },
    })
      .then((result) => result)
      .catch((error) => []);
    collection_for = {
      ...collection_for,
      name: group.name,
      picture:
        group.picture_url === null ? "img/group_icon.png" : group.picture_url,
    };
  } else if (query_param.distributor_id) {
    const people = await People.findOne({
      attributes: ["firstname", "lastname", "picture_url"],
      where: { id: query_param.distributor_id },
    })
      .then((result) => result)
      .catch((error) => []);
    collection_for = {
      ...collection_for,
      name: [people.firstname, people.lastname].join(" "),
      picture:
        people.picture_url === null ? "img/user_icons.png" : people.picture_url,
    };
  }
  console.log(query_param);
  console.log('query_param');
  let growth = {};
  if (JSON.parse(is_dashboard)) {
    const thisYearGrowth = await getDashboardGrowth(query_param);
    growth = {
      ...growth,
      thisYearGrowth: {
        year: parseInt(query_param.year),
        data: thisYearGrowth,
      },
    };
    const lastYear = parseInt(query_param.year) - 1;
    const lastYearGrowth = await getDashboardGrowth({
      ...query_param,
      year: lastYear.toString(),
    });
    growth = {
      ...growth,
      lastYearGrowth: {
        year: lastYear,
        data: lastYearGrowth,
      },
    };
  }
  BusinessPlanSummary.findAll({
    where: query_param,
    attributes: [
      [
        Sq.fn("sum", Sq.col("annual_book_points_goal_total")),
        "total_annual_book_points_goal",
      ],
      [
        Sq.fn("sum", Sq.col("annual_bbt_amount_goal_total")),
        "total_annual_bbt_amount_goal",
      ],
      [
        Sq.fn("sum", Sq.col("annual_group_amount_goal_total")),
        "total_annual_group_amount_goal",
      ],
      [
        Sq.fn("sum", Sq.col("annual_actual_book_points_total")),
        "total_annual_actual_book_points",
      ],
      [
        Sq.fn("sum", Sq.col("annual_actual_bbt_amount_total")),
        "total_annual_actual_bbt_amount",
      ],
    ],
  })
    .then((result) => {
      if (result) {
        res.status(200).send({
          ...formatCollection(result[0].dataValues),
          collection_for,
          growth,
        });
      } else {
        res.status(400).send({ success: 0 });
      }
    })
    .catch((err) => {
      console.log("Error", err);
      res.status(503).send({ error: err.original });
    });
});

getBBTPoints = (book_id, all_books) => {
  const matched = all_books.filter((albk) => albk.id === book_id);
  if (matched.length == 0) return -1;
  return typeof matched[0] !== "undefined" ? matched[0].bbt_book_points : 0;
};

fieldsToAppend = (user_info) => {
  return {
    created_by_id: user_info.user_id,
    last_modified_by_id: user_info.user_id,
    people_add_to_group: user_info.people_default_group,
    organization_id: user_info.org_id,
  };
};

getArrayValueSum = (dataArr) => {
  //console.log('dataArray', dataArr)
  return dataArr.reduce((sum, item) => {
    return sum + item;
  }, 0);
};

// RollUp Sankirtan Goal
roleUpSankirtanGoal = async (group_id, year, goal_data) => {
  delete goal_data.distributor_id;
  const goalRollUpData = await BusinessPlanSummary.findOne({
    where: { group_id, year },
  })
    .then((result) => {
      let goalRollUp;
      if (result) {
        let msf_book_points_goal_roll_up_merge = goal_data.msf_book_points_goal;
        let msf_bbt_amount_goal_roll_up_merge = goal_data.msf_bbt_amount_goal;
        let msf_group_amount_goal_roll_up_merge =
          goal_data.msf_group_amount_goal;
        if (result.msf_book_points_goal_roll_up !== null) {
          if (
            result.msf_book_points_goal_roll_up.length >=
            goal_data.msf_book_points_goal.length
          ) {
            msf_book_points_goal_roll_up_merge = mergeMSFRecords(
              result.msf_book_points_goal_roll_up,
              goal_data.msf_book_points_goal
            );
            msf_bbt_amount_goal_roll_up_merge = mergeMSFRecords(
              result.msf_bbt_amount_goal_roll_up,
              goal_data.msf_bbt_amount_goal
            );
            msf_group_amount_goal_roll_up_merge = mergeMSFRecords(
              result.msf_group_amount_goal_roll_up,
              goal_data.msf_group_amount_goal
            );
          } else {
            msf_book_points_goal_roll_up_merge = mergeMSFRecords(
              goal_data.msf_book_points_goal,
              result.msf_book_points_goal_roll_up
            );
            msf_bbt_amount_goal_roll_up_merge = mergeMSFRecords(
              goal_data.msf_bbt_amount_goal,
              result.msf_bbt_amount_goal_roll_up
            );
            msf_group_amount_goal_roll_up_merge = mergeMSFRecords(
              goal_data.msf_group_amount_goal,
              result.msf_group_amount_goal_roll_up
            );
          }
        }
        // Merged Existing Goal into the total
        let msf_book_points_goal_total_merge = msf_book_points_goal_roll_up_merge;
        let msf_bbt_amount_goal_total_merge = msf_bbt_amount_goal_roll_up_merge;
        let msf_group_amount_goal_total_merge = msf_group_amount_goal_roll_up_merge;
        if (result.msf_book_points_goal !== null) {
          if (
            msf_book_points_goal_roll_up_merge.length >
            result.msf_book_points_goal.length
          ) {
            msf_book_points_goal_total_merge = mergeMSFRecords(
              msf_book_points_goal_roll_up_merge,
              result.msf_book_points_goal
            );
            msf_bbt_amount_goal_total_merge = mergeMSFRecords(
              msf_bbt_amount_goal_roll_up_merge,
              result.msf_bbt_amount_goal
            );
            msf_group_amount_goal_total_merge = mergeMSFRecords(
              msf_group_amount_goal_roll_up_merge,
              result.msf_group_amount_goal
            );
          } else {
            msf_book_points_goal_total_merge = mergeMSFRecords(
              result.msf_book_points_goal,
              msf_book_points_goal_roll_up_merge
            );
            msf_bbt_amount_goal_total_merge = mergeMSFRecords(
              result.msf_bbt_amount_goal,
              msf_bbt_amount_goal_roll_up_merge
            );
            msf_group_amount_goal_total_merge = mergeMSFRecords(
              result.msf_group_amount_goal,
              msf_group_amount_goal_roll_up_merge
            );
          }
        }
        // End

        goalRollUp = {
          id: result.id,
          year: goal_data.year,
          group_id: group_id,
          // distributor_id: goal_data.distributor_id,

          msf_book_points_goal_roll_up: getArrToString(
            msf_book_points_goal_roll_up_merge
          ),
          msf_bbt_amount_goal_roll_up: getArrToString(
            msf_bbt_amount_goal_roll_up_merge
          ),
          msf_group_amount_goal_roll_up: getArrToString(
            msf_group_amount_goal_roll_up_merge
          ),

          msf_book_points_goal_total: getArrToString(
            msf_book_points_goal_total_merge
          ),
          msf_bbt_amount_goal_total: getArrToString(
            msf_bbt_amount_goal_total_merge
          ),
          msf_group_amount_goal_total: getArrToString(
            msf_group_amount_goal_total_merge
          ),

          annual_book_points_goal_roll_up: getArrayValueSum(
            msf_book_points_goal_roll_up_merge
          ),
          annual_bbt_amount_goal_roll_up: getArrayValueSum(
            msf_bbt_amount_goal_roll_up_merge
          ),
          annual_group_amount_goal_roll_up: getArrayValueSum(
            msf_group_amount_goal_roll_up_merge
          ),

          annual_book_points_goal_total: getArrayValueSum(
            msf_book_points_goal_total_merge
          ),
          annual_bbt_amount_goal_total: getArrayValueSum(
            msf_bbt_amount_goal_total_merge
          ),
          annual_group_amount_goal_total: getArrayValueSum(
            msf_group_amount_goal_total_merge
          ),

          organization_id: goal_data.organization_id,
          created_by_id: goal_data.created_by_id,
          last_modified_by_id: goal_data.last_modified_by_id,
        };
      } else {
        goalRollUp = {
          year: goal_data.year,
          group_id: group_id,
          // distributor_id: goal_data.distributor_id,

          msf_book_points_goal_roll_up: getArrToString(
            goal_data.msf_book_points_goal
          ),
          msf_bbt_amount_goal_roll_up: getArrToString(
            goal_data.msf_bbt_amount_goal
          ),
          msf_group_amount_goal_roll_up: getArrToString(
            goal_data.msf_group_amount_goal
          ),

          msf_book_points_goal_total: getArrToString(
            goal_data.msf_book_points_goal
          ),
          msf_bbt_amount_goal_total: getArrToString(
            goal_data.msf_bbt_amount_goal
          ),
          msf_group_amount_goal_total: getArrToString(
            goal_data.msf_group_amount_goal
          ),

          annual_book_points_goal_roll_up: getArrayValueSum(
            goal_data.msf_book_points_goal
          ),
          annual_bbt_amount_goal_roll_up: getArrayValueSum(
            goal_data.msf_bbt_amount_goal
          ),
          annual_group_amount_goal_roll_up: getArrayValueSum(
            goal_data.msf_group_amount_goal
          ),

          annual_book_points_goal_total: getArrayValueSum(
            goal_data.msf_book_points_goal
          ),
          annual_bbt_amount_goal_total: getArrayValueSum(
            goal_data.msf_bbt_amount_goal
          ),
          annual_group_amount_goal_total: getArrayValueSum(
            goal_data.msf_group_amount_goal
          ),

          organization_id: goal_data.organization_id,
          created_by_id: goal_data.created_by_id,
          last_modified_by_id: goal_data.last_modified_by_id,
        };
      }
      return goalRollUp;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
  if (!goalRollUpData) {
   // console.log("False1");
    return false;
  }
  let rollupResponse;
  if (typeof goalRollUpData.id === "undefined") {
    // Create roll-up for parent group
    rollupResponse = await BusinessPlanSummary.create(goalRollUpData)
      .then(async (result) => {
        return true;
      })
      .catch((err) => {
       // console.log(err);
        return false;
      });
  } else {
    const goal_id = goalRollUpData.id;
    delete goalRollUpData.id;
    // Update roll-up for parent group
    rollupResponse = await BusinessPlanSummary.update(goalRollUpData, {
      where: { id: goal_id },
    })
      .then(async (result) => {
        return true;
      })
      .catch((err) => {
      //  console.log(err);
        return false;
      });
  }

  if (!rollupResponse) {
  //  console.log("False2");
    return false;
  }

  // Looking for the parent group of the current group
  const finalResponse = await Group.findOne({ where: { id: group_id } })
    .then((result) => {
      if (result.parent_group) {
        return roleUpSankirtanGoal(result.parent_group, year, goal_data);
      } else {
        return true;
      }
    })
    .catch((err) => {
     // console.log(err);
      return false;
    });

  return finalResponse;
};

roleUpSankirtanGoalActual = async (group_id, year, goal_data) => {
  const goalRollUpData = await BusinessPlanSummary.findOne({
    where: { group_id, year },
  })
    .then((result) => {
      let goalRollUp;
      if (result) {
        let msf_actual_group_amount_roll_up_merge =
          goal_data.msf_actual_group_amount;
        if (result.msf_actual_group_amount_roll_up !== null) {
          if (
            result.msf_actual_group_amount_roll_up.length >=
            goal_data.msf_actual_group_amount.length
          ) {
            msf_actual_group_amount_roll_up_merge = mergeMSFRecords(
              result.msf_actual_group_amount_roll_up,
              goal_data.msf_actual_group_amount
            );
          } else {
            msf_actual_group_amount_roll_up_merge = mergeMSFRecords(
              goal_data.msf_actual_group_amount,
              result.msf_actual_group_amount_roll_up
            );
          }
        }
        // Merged Existing Goal into the total
        let msf_actual_group_amount_total_merge = msf_actual_group_amount_roll_up_merge;
        if (result.msf_actual_group_amount !== null) {
          if (
            msf_actual_group_amount_roll_up_merge.length >
            result.msf_actual_group_amount.length
          ) {
            msf_actual_group_amount_total_merge = mergeMSFRecords(
              msf_actual_group_amount_roll_up_merge,
              result.msf_actual_group_amount
            );
          } else {
            msf_actual_group_amount_total_merge = mergeMSFRecords(
              result.msf_actual_group_amount,
              msf_actual_group_amount_roll_up_merge
            );
          }
        }
        // End
        goalRollUp = {
          id: result.id,
          year: goal_data.year,
          group_id: group_id,
          // distributor_id: goal_data.distributor_id,

          msf_actual_group_amount_roll_up: getArrToString(
            msf_actual_group_amount_roll_up_merge
          ),

          msf_actual_group_amount_total: getArrToString(
            msf_actual_group_amount_total_merge
          ),

          annual_actual_group_amount_roll_up: getArrayValueSum(
            msf_actual_group_amount_roll_up_merge
          ),

          annual_actual_group_amount_total: getArrayValueSum(
            msf_actual_group_amount_total_merge
          ),

          organization_id: goal_data.organization_id,
          last_modified_by_id: goal_data.last_modified_by_id,
        };
      }
      return goalRollUp;
    })
    .catch((err) => {
    //  console.log(err);
      return false;
    });
  if (!goalRollUpData) {
   // console.log("False1");
    return false;
  }

  const goal_id = goalRollUpData.id;
  delete goalRollUpData.id;
  // Update roll-up for parent group
  const rollupResponse = await BusinessPlanSummary.update(goalRollUpData, {
    where: { id: goal_id },
  })
    .then(async (result) => {
      return true;
    })
    .catch((err) => {
     // console.log(err);
      return false;
    });

  if (!rollupResponse) {
   // console.log("False2");
    return false;
  }

  // Looking for the parent group of the current group
  const finalResponse = await Group.findOne({ where: { id: group_id } })
    .then((result) => {
      if (result.parent_group) {
        return roleUpSankirtanGoalActual(result.parent_group, year, goal_data);
      } else {
        return true;
      }
    })
    .catch((err) => {
     // console.log(err);
      return false;
    });

  return finalResponse;
};
// Roll-Up Transactions
addNewTransactions = (field_name, current_data) => {
  if (field_name === null) {
    return current_data;
  } else {
    field_name = isNaN(field_name) ? moneyToNumber(field_name) : field_name;
      let coming_value = 0;
      if (typeof current_data !== "undefined") {
      //  console.log('field_name', current_data);
        current_data = isNaN(current_data) ? moneyToNumber(current_data) : current_data;
      }
    return +field_name + +current_data;
  }
};

// Roll-Up Transactions
addNewTransaction = (field_name, current_data, previous_summary) => {
  if (previous_summary[field_name] === null) {
    return current_data;
  } else {
    if (previous_summary[field_name].length > current_data.length) {
      if (
        [
          "msf_actual_book_points_book_type_total",
          "monthly_actual_book_points_book_type_total",
        ].includes(field_name)
      ) {
        return sumWithExistingBookType(
          previous_summary[field_name],
          current_data
        );
      } else {
        return sumWithExisting(previous_summary[field_name], current_data);
      }
    } else {
      if (
        [
          "msf_actual_book_points_book_type_total",
          "monthly_actual_book_points_book_type_total",
        ].includes(field_name)
      ) {
        return sumWithExistingBookType(
          current_data,
          previous_summary[field_name]
        );
      } else {
        return sumWithExisting(current_data, previous_summary[field_name]);
      }
    }
  }
};

const getCurrentDateTime = function () {
  var dt = new Date();
  let current_date = `${dt.getFullYear().toString().padStart(4, "0")}-${(
    dt.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${dt
    .getDate()
    .toString()
    .padStart(2, "0")} ${dt
    .getHours()
    .toString()
    .padStart(2, "0")}:${dt
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${dt.getSeconds().toString().padStart(2, "0")}`;
  return current_date;
};

bookTypePoints = (transactionLineItems,team_type) => {
  let book_type_points = {
    "M-Big": 0,
    Big: 0,
    Full: 0,
    Large:0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
  let arabic_book_type_points = {
    "M-Big": 0,
    Big: 0,
    Full: 0,
    Large:0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
  let transaction_book_points = 0;
  let transaction_amount=0;
  transactionLineItems.map((item) => {
    const book_type = item.item !== null ? item.item.book_type === "Set" ? "Full" : item.item.book_type : null;  
    if (typeof book_type_points[book_type] !== "undefined") {
      // total_points +=item.transaction_book_points * parseInt(item.quantity);
      book_type_points[book_type] += item.transaction_book_points * parseInt(item.quantity);
      transaction_book_points +=   item.transaction_book_points * parseInt(item.quantity);
      if(item.net_amount !== null);
      {
        transaction_amount = parseInt(moneyToNumber(item.net_amount));
      }
      transaction_book_quantity = item.quantity;
    }
 

    if (typeof arabic_book_type_points[book_type] !== "undefined") {
      if(item.item.language == 'Arabic'){
        arabic_book_type_points[book_type] +=
        item.transaction_book_points * parseInt(item.quantity);
      }
    }
   
  });

  return { book_type_points, transaction_book_points ,transaction_book_quantity ,transaction_amount,arabic_book_type_points};
};
getArrOfBookTypeTotals = (field,bookTypePoints) => {
  let sum=getArrayValueSum(bookTypePoints);
  sum = (field === null) ? sum : sum + field;
  return sum;
};
getArrOfArrToStringsss = (arr_data) => {
  console.log('arr data', arr_data)
  let strng = "{";
  arr_data.map((data, key) => {
    if (key !== 0) {
      strng += ",";
    }
    const arrToStrng = getArrToStringsss(data);
    strng += arrToStrng === null ? "{0,0,0,0,0,0,0}" : getArrToStringsss(data);
  });
  strng += "}";
  return strng;
};

getArrToStringsss = (arr_data) => {
  let hasNonZero = false;
  let strng = "{";
  arr_data.map((data, key) => {
    if (key !== 0) {
      strng += ",";
    }
    strng += data;
    if (data > 0) {
      hasNonZero = true;
    }
  });
  strng += "}";
  return hasNonZero ? strng : null;
};
getArrOfBookTypeTotalNew = (field,bookTypePoints,team_type) => {
  let arr=[];
  if(field == null){
    SANKIRTAN_GROUP_TYPE.map((key,value) => {
      if(key != team_type){
         arr[value]=[0, 0, 0, 0, 0, 0, 0, 0];
      }else{
         arr[value]=bookTypePoints;
      }
    });
  }else{
     arr=field;
      SANKIRTAN_GROUP_TYPE.map((key,value) => {
      if(key == team_type){
        arr[value] = getSumOfArrays(arr[value],bookTypePoints);
      }
    });
  
  
}
 return arr;
};
getArrOfBookTypeTotalNew = (field,bookTypePoints,team_type) => {
 let arr=[];
  if(field == null){
    SANKIRTAN_GROUP_TYPE.map((key,value) => {
      if(key != team_type){
         arr[value]=[0, 0, 0, 0, 0, 0, 0, 0];
      }else{
         arr[value]=bookTypePoints;
      }
    });
  }else{
    console.log('field',field);
     arr=field;
      SANKIRTAN_GROUP_TYPE.map((key,value) => {
      if(key == team_type){
        arr[value] = getSumOfArrays(arr[value],bookTypePoints);
      }
    });

 }

 return arr;
};
router.get('/transaction-rollup', async function (req, res) {
  var updated_count = 0;
  var success_count = 0;
  var failed_count = 0;
  const start_time = getCurrentDateTime();
  const transactions = await Transaction.findAll({
    where: {
      transasction_status: "Pending",
      "completed_summary_roll-ups": false,
    },
    attributes: [
      "id",
      "date",
      "transaction_group_id",
      "transaction_amount",
      "transaction_book_points",
    ],
    include: [
      {
        model: TransactionLineItem,
        attributes: ["transaction_book_points", "quantity","price","net_amount"],
        include: [
          {
            model: Item,
            attributes: ["book_type","language"],
          },
        ],
      },
      {
        model: TransactionPeople,
        attributes: ["distributor_id","distributor_index"],
      },
    ],
    order: [
      ["transaction_group_id", "ASC"],
      ["date", "ASC"],
    ],
  }) .then((result) => {
    return result;
  })
  .catch((err) => {
    console.log(err);
    return false;
  });
  if (transactions && transactions.length > 0) {
    updated_count = transactions.length;
    const periods = await Period.findAll({
      where: { status: "Open" },
      order: [["number", "ASC"]],
    })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
      let groups = await Group.findAll({
        attributes:["id","book_distribution_reporting_level","sankirtan_group_type"]
      })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
      // console.log('groups groups groups');
      // console.log(groups);
      let groupdata={};
      groups.map((group) => {
        if (typeof groupdata[group.id] === "undefined") {
          groupdata[group.id] = {
            reporting_level: group.book_distribution_reporting_level,
            sankirtan_group_type:group.sankirtan_group_type,
          };
        }
      });
      if (periods && periods.length > 0) {
        let transaction = {};
        var tran_ids = [];
        let distributors_rollup={};

        transactions.map((trans) => {
          const group_id = trans.transaction_group_id;
          if (typeof transaction[group_id] === "undefined") {
            transaction[group_id] = {};
            transaction[group_id]["periods"] ={};
            transaction[group_id]["distributors"] = {};
          }
          const checkperiod = checkPeriod(periods, trans);
          checkperiod.map((value) => {
            if(typeof transaction[group_id]["periods"][value] === "undefined"){
              transaction[group_id]["periods"][value]=[];
            }
            trans = {
              ...JSON.parse(JSON.stringify(trans)),
              ...bookTypePoints(trans.transaction_line_items,groupdata[group_id].sankirtan_group_type),
            };
            transaction[group_id]["periods"][value].push(trans);
          });
          trans.transaction_people.map((people) => {
            if(groupdata[group_id].reporting_level == 'Individual' && people.distributor_index == 0){
              if(typeof transaction[group_id]["distributors"][people.distributor_id] === "undefined"){
                transaction[group_id]["distributors"][people.distributor_id]={};
                transaction[group_id]["distributors"][people.distributor_id]['period']={};
              }
              checkperiod.map((value) => {
                if(typeof transaction[group_id]["distributors"][people.distributor_id]['period'][value] === "undefined"){
                  transaction[group_id]["distributors"][people.distributor_id]['period'][value]=[];
                }
                trans = {
                  ...JSON.parse(JSON.stringify(trans)),
                  ...bookTypePoints(trans.transaction_line_items),
                };
                transaction[group_id]["distributors"][people.distributor_id]['period'][value].push(trans);
              });
            }
          });
        });
        for (let group_id in transaction) {
          let year_transaction=[];
          let year_transaction_ids=[];
          for(let period_id in transaction[group_id]['periods']){
            const periodById = await Period.findOne({ where: { id: period_id,is_active:1 } });
                if(periodById != null){
                  let year=periodById.year;
                  const goal_summary = await BusinessPlanSummary.findOne({
                    where: { group_id, period_id, year,distributor_id:null},
                  })
                  .then((result) => {
                    if (result) {
                      return result;
                    } else {
                      return false;
                    }
                  })
                  .catch((error) => {
                    console.log(error);
                    return false;
                  });  
                  
                  if (goal_summary) {
                    const {
                      actual_book_points,
                      actual_bbt_amount,
                      book_type_points,
                      arabic_book_points,
                    } = combineCollectionss(transaction[group_id]['periods'][period_id]);
                    const {
                      actual_book_points_yearly,
                      actual_bbt_amount_yearly,
                      book_type_points_yearly,
                      arabic_book_points_yearly,
                    } = combineCollectionssYearly(transaction[group_id]['periods'][period_id],year_transaction);
                    let rollup_data={group_id,period_id};
               
                    rollup_data = {
                      ...rollup_data,
                      actual_book_points: addNewTransactions(
                        goal_summary["actual_book_points"],
                        actual_book_points,
                      ),
                      actual_bbt_amount: addNewTransactions(
                        goal_summary["actual_bbt_amount"],
                        actual_bbt_amount,
                      ),
                      actual_book_points_total: addNewTransactions(
                        goal_summary["actual_book_points_total"],
                        actual_book_points,
                      ),
                      actual_bbt_amount_total: addNewTransactions(
                        goal_summary["actual_bbt_amount_total"],
                        actual_bbt_amount,
                      ),
                      actual_book_points_book_type_total: getArrOfArrToStrings(
                        goal_summary["actual_book_points_book_type_total"],
                        book_type_points,
                      ),
                      actual_arabic_book_points_book_type_total: getArrOfArrToStrings(
                        goal_summary["actual_arabic_book_points_book_type_total"],
                        arabic_book_points,
                      ),
                      actual_team_book_points_book_type_total:getArrOfBookTypeTotalNew(
                        goal_summary["actual_team_book_points_book_type_total"],
                        book_type_points,
                        groupdata[group_id].sankirtan_group_type,
                      )
                    };
                    // console.log(rollup_data);
                    // return false;
                    await BusinessPlanSummary.update(rollup_data, {
                      where: { id: goal_summary.id },
                    });
                
                    await updateTransactionsYearly(
                      {
                        group_id:group_id,
                        year,
                        distributor_id:null,
                      },
                      {
                        actual_book_points_yearly,
                        actual_bbt_amount_yearly,
                        book_type_points_yearly,
                        arabic_book_points_yearly
                      },
                      {
                        type:'without_roll_up'
                      },
                      {
                        team_type:groupdata[group_id].sankirtan_group_type,
                      }
                    );
                    const has_parent = await Group.findOne({ where: { id: group_id } })
                    .then((result) => {
                      return result;
                    })
                    .catch((err) => {
                      console.log(err);
                      return false;
                    });
                    // No parent found!
                    if (!has_parent) {
                      // return res.status(503).send('Something went wrong!');
                      console.log("Something went wrong!");
                    }
                    if (typeof has_parent.parent_group === "undefined") {
                      console.log("No more parent to roll-up", group_id);
                    }
                    await roleUpActualTransactions(
                      {
                        group_id:has_parent.parent_group,
                        period_id:period_id,
                        year
                      },
                      {
                        actual_book_points,
                        actual_bbt_amount,
                        book_type_points,
                        arabic_book_points
                      },
                      {
                        actual_book_points_yearly,
                        actual_bbt_amount_yearly,
                        book_type_points_yearly,
                        arabic_book_points_yearly
                      },   
                      {
                        team_type:groupdata[group_id].sankirtan_group_type,
                      }
                    );
                    var trsanaction_id = getTransactionIds(transaction[group_id]['periods'][period_id]);
                    var trsanaction_ids = trsanaction_id.filter(
                      (item, pos) => trsanaction_id.indexOf(item) === pos
                    );
                    if (trsanaction_ids.length) {
                      let transaction_reports = await Transaction.update(
                        {
                          "completed_summary_roll-ups": true,
                          transasction_status: "Active",
                        },
                        { where: { id: { [Sq.Op.in]: trsanaction_ids } } }
                      ).then(async (result) => {
                        success_count = result.toString();
                        const transactionByIds = await Transaction.findAll({
                          where: {
                            id: {
                              [Sq.Op.in]: trsanaction_ids,
                            },
                          },
                          attributes: ["id", "date", "completed_summary_roll-ups"],
                        }).then(async (results) => {
                          if (results && results.length) {
                            results.forEach(async function (item, index) {
                              if (
                                item.dataValues != undefined &&
                                item.dataValues.transasction_status == "Pending"
                              ) {
                                failed_count = index + 1;
                                let transaction_reports = await Transaction.update(
                                  { transasction_status: "Cancelled" },
                                  { where: { id: item.dataValues.id } }
                                );
                              }
                            });
                          }
                        });
                      });
                    }
                  }
                }
              }
                for (let distributor_id in transaction[group_id]['distributors']) {  
                  for(let period_id in transaction[group_id]['distributors'][distributor_id]['period']){
                    let year_transaction_ids=[];
                    const periodById = await Period.findOne({ where: { id: period_id,is_active:1 } });
                    if(periodById != null){
                      let year=periodById.year;
                      const goal_summary = await BusinessPlanSummary.findOne({
                        where: { group_id, period_id, year,distributor_id},
                      })
                      .then((result) => {
                        if (result) {
                          return result;
                        } else {
                          return false;
                        }
                      })
                      .catch((error) => {
                        console.log(error);
                        return false;
                      });
                     
                      if (goal_summary) {
                    
                        const {
                          actual_book_points,
                          actual_bbt_amount,
                          book_type_points,
                          arabic_book_points
                        } = combineCollectionss(transaction[group_id]['distributors'][distributor_id]['period'][period_id],year_transaction_ids);
                        const {
                          actual_book_points_yearly,
                          actual_bbt_amount_yearly,
                          book_type_points_yearly,
                          arabic_book_points_yearly
                        } = combineCollectionssYearly(transaction[group_id]['distributors'][distributor_id]['period'][period_id],year_transaction_ids);
                        
                        
                        let rollup_data={group_id,period_id,distributor_id};
                        rollup_data = {
                          ...rollup_data,
                          actual_book_points: addNewTransactions(
                            goal_summary["actual_book_points"],
                            actual_book_points,
                          ),
                          actual_bbt_amount: addNewTransactions(
                            goal_summary["actual_bbt_amount"],
                            actual_bbt_amount,
                          ),
                          actual_book_points_total: addNewTransactions(
                            goal_summary["actual_book_points_total"],
                            actual_book_points,
                          ),
                          actual_bbt_amount_total: addNewTransactions(
                            goal_summary["actual_bbt_amount_total"],
                            actual_bbt_amount,
                          ),
                          actual_book_points_book_type_total: getArrOfArrToStrings(
                            goal_summary["actual_book_points_book_type_total"],
                            book_type_points,
                          ),
                          actual_arabic_book_points_book_type_total: getArrOfArrToStrings(
                            goal_summary["actual_arabic_book_points_book_type_total"],
                            arabic_book_points,
                          ),
                          actual_team_book_points_book_type_total:getArrOfBookTypeTotalNew(
                            goal_summary["actual_team_book_points_book_type_total"],
                            book_type_points,
                            groupdata[group_id].sankirtan_group_type,
                          )
                        };
                        await BusinessPlanSummary.update(rollup_data, {
                          where: { id: goal_summary.id },
                        });
                        
                        await updateTransactionsYearly(
                          {
                            group_id:group_id,
                            year,
                            distributor_id,
                          },
                          {
                            actual_book_points_yearly,
                            actual_bbt_amount_yearly,
                            book_type_points_yearly,
                            arabic_book_points_yearly
                          },
                          {
                            type:'without_roll_up'
                          },
                          {
                            team_type:groupdata[group_id].sankirtan_group_type,
                          },
                        );
                      }
                    }
                  }
                }
        
              }
  
        // console.log('bulk testing');
        // console.log(transaction);
        // return false;
      //  for (let group_id in transaction) {
      //     let year_transaction_ids=[];
      //     for (let period_type in transaction[group_id]) {  
      //       for(let period_id in transaction[group_id][period_type] ){
      //         if(period_id != 100 && period_id != 0){
                
      //         }
      //       }
      //     }
      //   }
        success_count = updated_count - failed_count;
        let end_time = getCurrentDateTime();
        let transaction_found_reports = {
          updated_count: updated_count,
          start_time: start_time,
          end_time: end_time,
          success_count: success_count,
          failed_count: failed_count,
          batch_date: start_time,
        };
        RollupReports.create(transaction_found_reports)
          .then((insterted) => {
            return true;
          })
          .catch((err) => {
            console.log("err===", err);
            return false;
          });
        return res.send("Roll-up successfully done!");
      } else{
        return res.send("Unable to find any open period where we can roll-up!");
      }
  } else {
    return res.send("Either got some error or no record found!");
  }
});


 router.get("/transaction-rollups", async function (req, res) {
//   // Get the list of all transactions which need to roll-up
  var updated_count = 0;
  var success_count = 0;
  var failed_count = 0;
  const start_time = getCurrentDateTime();
  const transactions = await Transaction.findAll({
    where: {
      transasction_status: "Pending",
      "completed_summary_roll-ups": false,
    },
    attributes: [
      "id",
      "date",
      "transaction_group_id",
      "transaction_amount",
      "transaction_book_points",
    ],
    include: [
      {
        model: TransactionLineItem,
        attributes: ["transaction_book_points", "quantity", "net_amount"],
        include: [
          {
            model: Item,
            attributes: ["book_type"],
          },
        ],
      },
    ],
    order: [
      ["transaction_group_id", "ASC"],
      ["date", "ASC"],
    ],
  })
    .then((result) => {
      return result;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });

  if (transactions && transactions.length > 0) {
    updated_count = transactions.length;
    const periods = await Period.findAll({
      where: { status: "Open", type: "MSF", is_active : 1 },
      order: [["number", "ASC"]],
    })
      .then((result) => {
        return result;
      })
      .catch((err) => {
       // console.log(err);
        return false;
      });
    if (periods && periods.length > 0) {
      let transaction = {};
      var tran_ids = [];
      transactions.map((trans) => {
        const group_id = trans.transaction_group_id;
        if (typeof transaction[group_id] === "undefined") {
          transaction[group_id] = {};
          transaction[group_id]["msf"] = {};
          transaction[group_id]["month"] = {};
        }
        // Arrange Data Monthly
        const _this_month = new Date(trans.date).getMonth();
        if (
          typeof transaction[group_id]["month"][_this_month] === "undefined"
        ) {
          transaction[group_id]["month"][_this_month] = [];
        }

        // Arrange Data MSF
        const _msf = getMSFPeriod(periods, trans);
        if (_msf !== 99) {
          if (typeof transaction[group_id]["msf"][_msf] === "undefined") {
            transaction[group_id]["msf"][_msf] = [];
          }
          trans = {
            ...JSON.parse(JSON.stringify(trans)),
            ...bookTypePoints(trans.transaction_line_items),
          };
          delete trans.transaction_line_items;
          transaction[group_id]["msf"][_msf].push(trans);
          transaction[group_id]["month"][_this_month].push(trans);
        } else {
          tran_ids.push(trans.id);
        }
      });
      //console.log("transaction===",transaction);
      //console.log("transactioncount===",Object.keys(transaction).length);
      //updated_count = Object.keys(transaction).length;
     
      for (let group_id in transaction) {
        var length = 0;
        const goal_summary = await BusinessPlanSummary.findOne({
          where: { group_id },
        })
          .then((result) => {
            //console.log("result==",result);
            if (result) {
              return result;
            } else {
              return false;
            }
          })
          .catch((error) => {
            console.log(error);
            return false;
          });
        
        if (goal_summary) {
          const {
            msf_actual_book_points,
            msf_actual_bbt_amount,
            msf_book_type_book_points,
          } = combineCollections(transaction[group_id]["msf"], "msf");
          console.log('data', msf_actual_book_points,
            msf_actual_bbt_amount,
            msf_book_type_book_points,);
          const {
            monthly_actual_book_points,
            monthly_actual_bbt_amount,
            monthly_book_type_book_points,
          } = combineCollections(transaction[group_id]["month"], "monthly");
          let rollup_data = {
            group_id,
            msf_actual_book_points: addNewTransaction(
              "msf_actual_book_points",
              msf_actual_book_points,
              goal_summary
            ),
            msf_actual_bbt_amount: addNewTransaction(
              "msf_actual_bbt_amount",
              msf_actual_bbt_amount,
              goal_summary
            ),
            msf_actual_book_points_total: addNewTransaction(
              "msf_actual_book_points_total",
              msf_actual_book_points,
              goal_summary
            ),
            msf_actual_bbt_amount_total: addNewTransaction(
              "msf_actual_bbt_amount_total",
              msf_actual_bbt_amount,
              goal_summary
            ),
            monthly_actual_book_points: addNewTransaction(
              "monthly_actual_book_points",
              monthly_actual_book_points,
              goal_summary
            ),
            monthly_actual_bbt_amount: addNewTransaction(
              "monthly_actual_bbt_amount",
              monthly_actual_bbt_amount,
              goal_summary
            ),
            monthly_actual_book_points_total: addNewTransaction(
              "monthly_actual_book_points_total",
              monthly_actual_book_points,
              goal_summary
            ),
            monthly_actual_bbt_amount_total: addNewTransaction(
              "monthly_actual_bbt_amount_total",
              monthly_actual_bbt_amount,
              goal_summary
            ),
            msf_actual_book_points_book_type_total: addNewTransaction(
              "msf_actual_book_points_book_type_total",
              msf_book_type_book_points,
              goal_summary
            ),
            monthly_actual_book_points_book_type_total: addNewTransaction(
              "monthly_actual_book_points_book_type_total",
              monthly_book_type_book_points,
              goal_summary
            ),
          };
          
          rollup_data = {
            ...rollup_data,
            msf_actual_book_points: getArrToString(
              rollup_data.msf_actual_book_points
            ),
            msf_actual_book_points_total: getArrToString(
              rollup_data.msf_actual_book_points_total
            ),
            msf_actual_bbt_amount_total: getArrToString(
              rollup_data.msf_actual_bbt_amount_total
            ),
            monthly_actual_book_points: getArrToString(
              rollup_data.monthly_actual_book_points
            ),
            monthly_actual_bbt_amount: getArrToString(
              rollup_data.monthly_actual_bbt_amount
            ),
            monthly_actual_book_points_total: getArrToString(
              rollup_data.monthly_actual_book_points_total
            ),
            monthly_actual_bbt_amount_total: getArrToString(
              rollup_data.monthly_actual_bbt_amount_total
            ),
            annual_actual_book_points: getArrayValueSum(
              rollup_data.msf_actual_book_points
            ),
            annual_actual_bbt_amount: getArrayValueSum(
              rollup_data.msf_actual_bbt_amount
            ),
            annual_actual_book_points_total: getArrayValueSum(
              rollup_data.msf_actual_book_points_total
            ),
            annual_actual_bbt_amount_total: getArrayValueSum(
              rollup_data.msf_actual_bbt_amount_total
            ),
            msf_actual_book_points_book_type_total: getArrOfArrToString(
              rollup_data.msf_actual_book_points_book_type_total
            ),
            monthly_actual_book_points_book_type_total: getArrOfArrToString(
              rollup_data.monthly_actual_book_points_book_type_total
            ),
            annual_actual_book_points_book_type_total: getArrOfBookTypeTotal(
              rollup_data.msf_actual_book_points_book_type_total
            ),
          };
          await BusinessPlanSummary.update(rollup_data, {
            where: { id: goal_summary.id },
          });
         

          const has_parent = await Group.findOne({ where: { id: group_id } })
            .then((result) => {
              return result;
            })
            .catch((err) => {
            //  console.log(err);
              return false;
            });
          // No parent found!
          if (!has_parent) {
            // return res.status(503).send('Something went wrong!');
          //  console.log("Something went wrong!");
          }
          if (typeof has_parent.parent_group === "undefined") {
            console.log("No more parent to roll-up", group_id);
          }

          await roleUpActualTransaction(has_parent.parent_group, {
            msf_actual_book_points,
            msf_actual_bbt_amount,
            msf_book_type_book_points,
            monthly_actual_book_points,
            monthly_actual_bbt_amount,
            monthly_book_type_book_points,
          });

          var trsanaction_id = getTransactionIds(transaction[group_id]["msf"]);

          var c = trsanaction_id.concat(tran_ids);
          var trsanaction_ids = c.filter(
            (item, pos) => c.indexOf(item) === pos
          );

          if (trsanaction_ids.length) {
            let transaction_reports = await Transaction.update(
              {
                "completed_summary_roll-ups": true,
                transasction_status: "Active",
              },
              { where: { id: { [Sq.Op.in]: trsanaction_ids } } }
            ).then(async (result) => {
              success_count = result.toString();
              const transactionByIds = await Transaction.findAll({
                where: {
                  id: {
                    [Sq.Op.in]: trsanaction_ids,
                  },
                },
                attributes: ["id", "date", "completed_summary_roll-ups"],
              }).then(async (results) => {
                if (results && results.length) {
                  results.forEach(async function (item, index) {
                    console.log(
                      "item.dataValues.transasction_status==",
                      item.dataValues.transasction_status
                    );
                    if (
                      item.dataValues != undefined &&
                      item.dataValues.transasction_status == "Pending"
                    ) {
                      failed_count = index + 1;
                      let transaction_reports = await Transaction.update(
                        { transasction_status: "Cancelled" },
                        { where: { id: item.dataValues.id } }
                      );
                    }
                  });
                }
              });
            });
          }
        }
      }
      success_count = updated_count - failed_count;
      let end_time = getCurrentDateTime();
      let transaction_found_reports = {
        updated_count: updated_count,
        start_time: start_time,
        end_time: end_time,
        success_count: success_count,
        failed_count: failed_count,
        batch_date: start_time,
      };
      RollupReports.create(transaction_found_reports)
        .then((insterted) => {
          return true;
        })
        .catch((err) => {
          console.log("err===", err);
          return false;
        });
      return res.send("Roll-up successfully done!");
    }

    return res.send("Unable to find any open period where we can roll-up!");
  } else {
    return res.send("Either got some error or no record found!");
  }
});

router.get('/transaction-rollups', async function (req, res) {
	let updated_count=0;
	let success_count=0;
	let failed_count=0;

	// Get the list of all transactions which need to roll-up 
	const start_time = getCurrentDateTime();
	const transactions = await Transaction.findAll({
		where: {
			transasction_status: 'Active',
			'completed_summary_roll-ups': false,
		},
		attributes: [
			'id',
			'date',
			'transaction_group_id',
			'transaction_amount',
			'transaction_book_points',
		],
		include: [
			{
				model: TransactionLineItem,
				attributes: ['transaction_book_points', 'quantity', 'net_amount'],
				include: [
					{
						model: Item,
						attributes: ['book_type'],
					},
				],
			},
		],
		order: [
			['transaction_group_id', 'ASC'],
			['date', 'ASC'],
		],
	})
		.then((result) => {
			return result;
		})
		.catch((err) => {
			console.log(err);
			return false;
		});
	if (typeof transactions !== 'undefined' && transactions  && transactions.length > 0) {
		updated_count=transactions.length;
		//console.log(' roll-up transactions to be updted...', updated_count);
		const periods = await Period.findAll({
			where: { status: 'Open', type: 'MSF', is_active : 1 },
			order: [['number', 'ASC']],
		})
			.then((result) => {
				return result;
			})
			.catch((err) => {
				console.log(err);
				return false;
			});
		if (periods && periods.length > 0) {
			let transaction = {};
			transactions.map((trans) => {
				const group_id = trans.transaction_group_id;
				if (typeof transaction[group_id] === 'undefined') {
					transaction[group_id] = {};
					transaction[group_id]['msf'] = {};
					transaction[group_id]['month'] = {};
				}
				// Arrange Data Monthly
				const _this_month = new Date(trans.date).getMonth();
				if (
					typeof transaction[group_id]['month'][_this_month] === 'undefined'
				) {
					transaction[group_id]['month'][_this_month] = [];
				}

				// Arrange Data MSF
				const _msf = getMSFPeriod(periods, trans);
				if (_msf !== 99) {
					// Return 99 in case no period availabe for the transaction date
					if (typeof transaction[group_id]['msf'][_msf] === 'undefined') {
						transaction[group_id]['msf'][_msf] = [];
					}
					trans = {...JSON.parse(JSON.stringify(trans)), ...bookTypePoints(trans.transaction_line_items)}
					delete trans.transaction_line_items;
					transaction[group_id]['msf'][_msf].push(trans);
					transaction[group_id]['month'][_this_month].push(trans);
				}
			});
			for (let group_id in transaction) {
				const goal_summary = await BusinessPlanSummary.findOne({
					where: { group_id },
				})
					.then((result) => {
						if (result) {
							return result;
						} else {
							return false;
						}
					})
					.catch((error) => {
						console.log(error);
						return false;
					});
				if (goal_summary) {
					const {
						msf_actual_book_points,
						msf_actual_bbt_amount,
						msf_book_type_book_points,
					} = combineCollections(transaction[group_id]['msf'], 'msf');
					const {
						monthly_actual_book_points,
						monthly_actual_bbt_amount,
						monthly_book_type_book_points,
					} = combineCollections(transaction[group_id]['month'], 'monthly');
					let rollup_data = {
						group_id,
						msf_actual_book_points: addNewTransaction(
							'msf_actual_book_points',
							msf_actual_book_points,
							goal_summary
						),
						msf_actual_bbt_amount: addNewTransaction(
							'msf_actual_bbt_amount',
							msf_actual_bbt_amount,
							goal_summary
						),
						msf_actual_book_points_total: addNewTransaction(
							'msf_actual_book_points_total',
							msf_actual_book_points,
							goal_summary
						),
						msf_actual_bbt_amount_total: addNewTransaction(
							'msf_actual_bbt_amount_total',
							msf_actual_bbt_amount,
							goal_summary
						),
						monthly_actual_book_points: addNewTransaction(
							'monthly_actual_book_points',
							monthly_actual_book_points,
							goal_summary
						),
						monthly_actual_bbt_amount: addNewTransaction(
							'monthly_actual_bbt_amount',
							monthly_actual_bbt_amount,
							goal_summary
						),
						monthly_actual_book_points_total: addNewTransaction(
							'monthly_actual_book_points_total',
							monthly_actual_book_points,
							goal_summary
						),
						monthly_actual_bbt_amount_total: addNewTransaction(
							'monthly_actual_bbt_amount_total',
							monthly_actual_bbt_amount,
							goal_summary
						),
						msf_actual_book_points_book_type_total: addNewTransaction(
							'msf_actual_book_points_book_type_total',
							msf_book_type_book_points,
							goal_summary
						),
						monthly_actual_book_points_book_type_total: addNewTransaction(
							'monthly_actual_book_points_book_type_total',
							monthly_book_type_book_points,
							goal_summary
						), 
					};
					rollup_data = {
						...rollup_data,
						msf_actual_book_points: getArrToString(
							rollup_data.msf_actual_book_points
						),
						msf_actual_bbt_amount: getArrToString(
							rollup_data.msf_actual_bbt_amount
						),
						msf_actual_book_points_total: getArrToString(
							rollup_data.msf_actual_book_points_total
						),
						msf_actual_bbt_amount_total: getArrToString(
							rollup_data.msf_actual_bbt_amount_total
						),
						monthly_actual_book_points: getArrToString(
							rollup_data.monthly_actual_book_points
						),
						monthly_actual_bbt_amount: getArrToString(
							rollup_data.monthly_actual_bbt_amount
						),
						monthly_actual_book_points_total: getArrToString(
							rollup_data.monthly_actual_book_points_total
						),
						monthly_actual_bbt_amount_total: getArrToString(
							rollup_data.monthly_actual_bbt_amount_total
						),
						annual_actual_book_points: getArrayValueSum(
							rollup_data.msf_actual_book_points
						),
						annual_actual_bbt_amount: getArrayValueSum(
							rollup_data.msf_actual_bbt_amount
						),
						annual_actual_book_points_total: getArrayValueSum(
							rollup_data.msf_actual_book_points_total
						),
						annual_actual_bbt_amount_total: getArrayValueSum(
							rollup_data.msf_actual_bbt_amount_total
						),
						msf_actual_book_points_book_type_total: getArrOfArrToString(rollup_data.msf_actual_book_points_book_type_total),
						monthly_actual_book_points_book_type_total: getArrOfArrToString(rollup_data.monthly_actual_book_points_book_type_total),
						annual_actual_book_points_book_type_total: getArrOfBookTypeTotal(rollup_data.msf_actual_book_points_book_type_total),
					};
					await BusinessPlanSummary.update(rollup_data, {
						where: { id: goal_summary.id },
					});
					success_count++;
		//console.log(' roll-up transactions success_count=.',success_count);
					const has_parent = await Group.findOne({ where: { id: group_id } })
						.then((result) => {
							return result;
						})
						.catch((err) => {
							console.log(err);
							return false;
						});
					// No parent found!
					if (!has_parent) {
						// return res.status(503).send('Something went wrong!');
						console.log('Something went wrong!');
					}
					if (typeof has_parent.parent_group === 'undefined') {
						// return res.status(200).send('No more parent to roll-up');
					//	console.log('No more parent to roll-up', group_id);
					}

					await roleUpActualTransaction(has_parent.parent_group, {
						msf_actual_book_points,
						msf_actual_bbt_amount,
						msf_book_type_book_points,
						monthly_actual_book_points,
						monthly_actual_bbt_amount,
						monthly_book_type_book_points
					});
				} //endif goal summary
			} //end groupid loop of transaction
			//console.log("success_count====",success_count);
			//console.log("failed_count====",failed_count);
			//console.log("updated_count====",updated_count);
			failed_count = updated_count - success_count ;
										const end_time = getCurrentDateTime();
										let transaction_reports = {
											updated_count:updated_count,
											start_time:start_time,
											end_time:end_time,
											success_count:success_count,
											failed_count:failed_count,
											batch_date:start_time,
										};
									RollupReports.create(transaction_reports)
										.then((inerted) => {
											//console.log("result==",inerted);
											return true;
										})
										.catch((err) => {
											//console.log("result==",err);
											return false;
										});
			return res.send('Roll-up successfully done!');
		} //end of periods exist
		return res.send('Unable to find any open period where we can roll-up!');
	}
	return res.send('Either got some error or no record found!');
});

sumWithExisting = (existing, coming) => {
  let sum = [];
  if (existing !== null) {
    existing.map((value, key) => {
      value = isNaN(value) ? moneyToNumber(value) : value;
      let coming_value = 0;
      if (typeof coming[key] !== "undefined") {
        coming_value = isNaN(coming[key])
          ? moneyToNumber(coming[key])
          : coming[key];
      }
      sum[key] = +coming_value + +value;
    });
  }
  return null;
};

sumWithExistingBookType = (existing, coming) => {
  let sum = [];
  if (existing !== null) {
    existing.map((value, key) => {
      if (typeof coming[key] !== "undefined") {
        value = value.map(
          (num, indx) => num + (coming[key][indx] ? coming[key][indx] : 0)
        );
      }
      sum[key] = value;
    });
  }
  return sum;
};

getMergeMSFRecord = (existing_record, current_record) => {
  return existing_record === null
    ? current_record
    : existing_record.length > current_record.length
    ? mergeMSFRecords(existing_record, current_record)
    : mergeMSFRecords(current_record, existing_record);
};
// combineCollections = (arr_data, period_type) => {
//   const keys_arr = Object.keys(arr_data);
//   const last_indx = keys_arr[keys_arr.length - 1];
//   let amount=0;
//   let point=0;
//   let book_type_points = {};
 
//   for (let i = 0; i <= last_indx; i++) {
//     if (typeof arr_data[i] !== "undefined") {
//       arr_data[i].map((arr) => {
//         amount += +moneyToNumber(arr.transaction_amount);
//         point += +arr.transaction_book_points;
//         for (key in arr.book_type_points) {
//           book_type_points[key] += arr.book_type_points[key];
//         }
//       });
//     }
//   }

  // msf_book_type_book_points.push(Object.values(book_type_points));
// }; 
combineCollectionss = (arr_data) => {
  let actual_book_points = 0;
  let actual_bbt_amount = 0;
  let type_points = {};
  let book_type_points=[];
  let arabic_book_points=[];
  type_points = {
    "M-Big": 0,
    Big: 0,
    Large:0,
    Full: 0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
  let arabic_type_points = {
    "M-Big": 0,
    Big: 0,
    Large:0,
    Full: 0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
  Object.keys(arr_data).map((i) => {
    if (typeof arr_data[i] !== "undefined") {
      actual_bbt_amount  += (+ arr_data[i].transaction_amount);
      actual_book_points += arr_data[i].transaction_book_points; 
      for (key in arr_data[i].book_type_points) {
        type_points[key] += arr_data[i].book_type_points[key];
      }
      for (k in arr_data[i].arabic_book_type_points) {
        arabic_type_points[k] += arr_data[i].arabic_book_type_points[k];
      }
    }
  });
  if(isNaN(actual_bbt_amount))
  {
    actual_bbt_amount = 0;
  }
  book_type_points=Object.values(type_points);
  arabic_book_points=Object.values(arabic_type_points);
  return {
    actual_book_points:actual_book_points,
    actual_bbt_amount:actual_bbt_amount,
    book_type_points:book_type_points,
    arabic_book_points
  };
};
combineCollectionssYearly = (arr_data,year_transaction_ids) => {
  let actual_book_points = 0;
  let actual_bbt_amount = 0;
  let type_points = {};
  let book_type_points=[];
  let arabic_book_points_yearly=[];
  type_points = {
    "M-Big": 0,
    Big: 0,
    Large:0,
    Full: 0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
  let arabic_type_points = {
    "M-Big": 0,
    Big: 0,
    Large:0,
    Full: 0,
    Medium: 0,
    Small: 0,
    BTG: 0,
    Magazines: 0,
  };
 
  Object.keys(arr_data).map((i) => {
    if (typeof arr_data[i] !== "undefined" && year_transaction_ids.indexOf(arr_data[i].id) == -1) {
      year_transaction_ids.push(arr_data[i].id);
      actual_bbt_amount  += (+ arr_data[i].transaction_amount);
      actual_book_points += arr_data[i].transaction_book_points; 
      for (key in arr_data[i].book_type_points) {
        type_points[key] += arr_data[i].book_type_points[key];
      }
      for (k in arr_data[i].arabic_book_type_points) {
        arabic_type_points[k] += arr_data[i].arabic_book_type_points[k];
      }
      
    }
  });
  if(isNaN(actual_bbt_amount))
  {
    actual_bbt_amount = 0;
  }
  book_type_points=Object.values(type_points);
  arabic_book_points_yearly=Object.values(arabic_type_points);
  return {
    actual_book_points_yearly:actual_book_points,
    actual_bbt_amount_yearly:actual_bbt_amount,
    book_type_points_yearly:book_type_points,
    arabic_book_points_yearly:arabic_book_points_yearly,
  };
};
combineCollections = (arr_data, period_type) => {
  const keys_arr = Object.keys(arr_data);
  const last_indx = keys_arr[keys_arr.length - 1];
  let msf_actual_book_points = [];
  let msf_actual_bbt_amount = [];
  let msf_book_type_book_points = [];
  let amount, point;
  let book_type_points = {};
  for (let i = 0; i <= last_indx; i++) {
    amount = 0;
    point = 0;
    book_type_points = {
      "M-Big": 0,
      Big: 0,
      Full: 0,
      Medium: 0,
      Small: 0,
      BTG: 0,
      Magazines: 0,
    };
    if (typeof arr_data[i] !== "undefined") {
      arr_data[i].map((arr) => {
        // console.log('gg', arr.transaction_amount)
        amount += +moneyToNumber(arr.transaction_amount) * arr.transaction_quantity;
        point += +arr.transaction_book_points;
        for (key in arr.book_type_points) {
          book_type_points[key] += arr.book_type_points[key];
        }
      });
    }
    msf_book_type_book_points.push(Object.values(book_type_points));
    msf_actual_book_points.push(point);
    msf_actual_bbt_amount.push(amount);
  }
  if (period_type === "msf") {
    return {
      msf_actual_book_points: msf_actual_book_points,
      msf_actual_bbt_amount: msf_actual_bbt_amount,
      msf_book_type_book_points: msf_book_type_book_points,
    };
  } else {
    return {
      monthly_actual_book_points: msf_actual_book_points,
      monthly_actual_bbt_amount: msf_actual_bbt_amount,
      monthly_book_type_book_points: msf_book_type_book_points,
    };
  }
};
getTransactionIds = (arr_data) => {
  let transaction_ids = [];
  arr_data.map((data, key) => {
    transaction_ids.push(data.id);
  });
  return transaction_ids;
};

// getTransactionIds = (arr_data) => {
//   console.log(arr_data);
//   console.log(Object.entries(arr_data));
//   let transaction_ids = [];
//   console.log('Idssss'+transaction_ids);
//   for (let period in arr_data) {
//     arr_data[period].map((arr) => {
//       transaction_ids.push(arr.id);
//     });
//   }
  
//   return transaction_ids;
// };

// getMSFPeriod = (periods, transaction) => {
//   let _number = 100;
//   periods.map((period) => {
//     const period_start = new Date(period.start);
//     const period_end = new Date(period.end);
//     const transaction_date = new Date(transaction.date);

//     if (
//       period_start.getTime() <= transaction_date.getTime() &&
//       transaction_date.getTime() <= period_end.getTime()
//     ) {
//       _number = period.number;
//     }
//   });
//   return _number - 1;
// };

checkPeriod = (periods, transaction) => {
  let period_ids=[];
  const transaction_date = new Date(transaction.date);
  periods.map((period) => {
  const period_start = new Date(period.start);
  const period_end = new Date(period.end);
    if (
      period_start.getTime() <= transaction_date.getTime() &&
      transaction_date.getTime() <= period_end.getTime()
    ) {
      period_ids.push(period.id);
    }
  });
  return period_ids;
};

getMonthPeriod = (periods, transaction) => {

  // console.log(periods);
  let _number=0;
  const transaction_date = new Date(transaction.date);
  periods.map((period) => {
    if(period.type == "Month"){
      const period_start = new Date(period.start);
      const period_end = new Date(period.end);
      if (
        period_start.getTime() <= transaction_date.getTime() &&
        transaction_date.getTime() <= period_end.getTime()
      ) {
        _number = period.id;
      }
    }
  });
  return _number;
};
getMSFPeriod = (periods, transaction) => {
  let _number = 100;
  periods.map((period) => {
    if(period.type == 'MSF'){
      const period_start = new Date(period.start);
      const period_end = new Date(period.end);
      const transaction_date = new Date(transaction.date);
    if (
        period_start.getTime() <= transaction_date.getTime() &&
        transaction_date.getTime() <= period_end.getTime()
      ) {
        _number = period.id;
      }
    }
 });
  return _number;
};
// RollUp Actual Transactions
roleUpActualTransactions =  async (
  {
    group_id,
    period_id,
    year,
  },
  {
    actual_book_points,
    actual_bbt_amount,
    book_type_points,
    arabic_book_points,
  },
  {
    actual_book_points_yearly,
    actual_bbt_amount_yearly,
    book_type_points_yearly,
    arabic_book_points_yearly,
  },
  {team_type}
) => {
  const goalRollUpData = await BusinessPlanSummary.findOne({
    where: { group_id, period_id, year,distributor_id:null },
  })
    .then((result) => {
      if (result) {
       let rollup_data = {id: result.id};
     
        // if(period_type == "msf"){
        //   rollup_data = {
        //     ...rollup_data,
        //     msf_actual_book_points_roll_up: addNewTransactions(
        //       result["msf_actual_book_points_roll_up"],
        //       actual_book_points,
        //     ),
        //     msf_actual_bbt_amount_roll_up: addNewTransactions(
        //       result["msf_actual_bbt_amount_roll_up"],
        //       actual_bbt_amount,
        //     ),
        //     msf_actual_book_points_total: addNewTransactions(
        //       result["msf_actual_book_points_total"],
        //       actual_book_points,
        //     ),
        //     msf_actual_bbt_amount_total: addNewTransactions(
        //       result["msf_actual_bbt_amount_total"],
        //       actual_bbt_amount,
        //     ),
        //     msf_actual_book_points_book_type_total: getArrOfArrToStrings(
        //       result["msf_actual_book_points_book_type_total"],
        //       book_type_points
        //     ),
        //   };
        // }else{
        //   rollup_data = {
        //     ...rollup_data,
        //     monthly_actual_book_points_roll_up: addNewTransactions(
        //       result["monthly_actual_book_points_roll_up"],
        //       actual_book_points,
        //     ),
        //     monthly_actual_bbt_amount_roll_up: addNewTransactions(
        //       result["monthly_actual_bbt_amount_roll_up"],
        //       actual_bbt_amount,
        //     ),
        //     monthly_actual_book_points_total: addNewTransactions(
        //       result["monthly_actual_book_points_total"],
        //       actual_book_points,
        //     ),
        //     monthly_actual_bbt_amount_total: addNewTransactions(
        //       result["monthly_actual_bbt_amount_total"],
        //       actual_bbt_amount,
        //     ),
        //     monthly_actual_book_points_book_type_total: getArrOfArrToStrings(
        //       result["monthly_actual_book_points_book_type_total"],
        //       book_type_points,
        //     ),
        //   };
        // }
       
        rollup_data = {
          ...rollup_data,
          actual_book_points_roll_up: addNewTransactions(
            result["actual_book_points_roll_up"],
            actual_book_points,
          ),
          actual_bbt_amount_roll_up: addNewTransactions(
            result["actual_bbt_amount_roll_up"],
            actual_bbt_amount,
          ),
          actual_book_points_total: addNewTransactions(
            result["actual_book_points_total"],
            actual_book_points,
          ),
          actual_bbt_amount_total: addNewTransactions(
            result["actual_bbt_amount_total"],
            actual_bbt_amount,
          ),
          actual_book_points_book_type_total: getArrOfArrToStrings(
            result["actual_book_points_book_type_total"],
            book_type_points,
          ),
          actual_arabic_book_points_book_type_total: getArrOfArrToStrings(
            result["actual_arabic_book_points_book_type_total"],
            arabic_book_points,
          ),
          actual_team_book_points_book_type_total:getArrOfBookTypeTotalNew(
            result["actual_team_book_points_book_type_total"],
            book_type_points,
            team_type,
          )
        };
        return rollup_data;
      } else {
        console.log("No recored found!");
        return false;
      }
    })
    .catch((err) => {
      return false;
    });
  if (!goalRollUpData) {
    //console.log('False1');
    return false;
  }
  const goal_id = goalRollUpData.id;
  delete goalRollUpData.id;
  
  // Update roll-up for parent group
  const rollupResponse = await BusinessPlanSummary.update(goalRollUpData, {
    where: { id: goal_id },
  })
  .then((result) => {
    return true;
  })
  .catch((err) => {
    console.log(err);
    return false;
  });
  console.log('roleupYearyyyyy');

  await updateTransactionsYearly(
    {
      group_id,
      year,
      distributor_id:null,
    },
    {
      actual_book_points_yearly,
      actual_bbt_amount_yearly,
      book_type_points_yearly,
      arabic_book_points_yearly
    },
    {
      type:'roll_up'
    },
    {team_type}
    
  );
    
  if (!rollupResponse) {
    return false;
  }
  // Looking for the parent group of the current group
  const finalResponse = await Group.findOne({ where: { id: group_id } })
    .then((result) => {
      if (result.parent_group) {
        return roleUpActualTransactions(
          {
            group_id:result.parent_group,
            period_id:period_id,
            year:year,
          },
          {
            actual_book_points:actual_book_points,
            actual_bbt_amount:actual_bbt_amount,
            book_type_points:book_type_points,
            arabic_book_points
          },
          {
            actual_book_points_yearly,
            actual_bbt_amount_yearly,
            book_type_points_yearly,
            arabic_book_points_yearly
          },
          {team_type}
        );
        // return roleUpActualTransactions(result.parent_group, goal_data, year);
      } else {
        return true;
      }
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
  return finalResponse;
};
// RollUp Actual Transactions
roleUpActualTransaction = async (group_id, goal_data, year = "2020") => {
  const {
    msf_actual_book_points,
    msf_actual_bbt_amount,
    msf_book_type_book_points,
    monthly_actual_book_points,
    monthly_actual_bbt_amount,
    monthly_book_type_book_points,
  } = goal_data;
  const goalRollUpData = await BusinessPlanSummary.findOne({
    where: { group_id, year },
  })
    .then((result) => {
      if (result) {
        let rollup_data = {
          id: result.id,
          msf_actual_book_points_roll_up: addNewTransaction(
            "msf_actual_book_points_roll_up",
            msf_actual_book_points,
            result
          ),
          msf_actual_bbt_amount_roll_up: addNewTransaction(
            "msf_actual_bbt_amount_roll_up",
            msf_actual_bbt_amount,
            result
          ),
          monthly_actual_book_points_roll_up: addNewTransaction(
            "monthly_actual_book_points_roll_up",
            monthly_actual_book_points,
            result
          ),
          monthly_actual_bbt_amount_roll_up: addNewTransaction(
            "monthly_actual_bbt_amount_roll_up",
            monthly_actual_bbt_amount,
            result
          ),

          msf_actual_book_points_total: addNewTransaction(
            "msf_actual_book_points_total",
            msf_actual_book_points,
            result
          ),
          msf_actual_bbt_amount_total: addNewTransaction(
            "msf_actual_bbt_amount_total",
            msf_actual_bbt_amount,
            result
          ),
          monthly_actual_book_points_total: addNewTransaction(
            "monthly_actual_book_points_total",
            monthly_actual_book_points,
            result
          ),
          monthly_actual_bbt_amount_total: addNewTransaction(
            "monthly_actual_bbt_amount_total",
            monthly_actual_bbt_amount,
            result
          ),
          msf_actual_book_points_book_type_total: addNewTransaction(
            "msf_actual_book_points_book_type_total",
            msf_book_type_book_points,
            result
          ),
          monthly_actual_book_points_book_type_total: addNewTransaction(
            "monthly_actual_book_points_book_type_total",
            monthly_book_type_book_points,
            result
          ),
        };
        rollup_data = {
          ...rollup_data,
          msf_actual_book_points_roll_up: getArrToString(
            rollup_data.msf_actual_book_points_roll_up
          ),
          msf_actual_bbt_amount_roll_up: getArrToString(
            rollup_data.msf_actual_bbt_amount_roll_up
          ),
          monthly_actual_book_points_roll_up: getArrToString(
            rollup_data.monthly_actual_book_points_roll_up
          ),
          monthly_actual_bbt_amount_roll_up: getArrToString(
            rollup_data.monthly_actual_bbt_amount_roll_up
          ),
          msf_actual_book_points_total: getArrToString(
            rollup_data.msf_actual_book_points_total
          ),
          msf_actual_bbt_amount_total: getArrToString(
            rollup_data.msf_actual_bbt_amount_total
          ),
          monthly_actual_book_points_total: getArrToString(
            rollup_data.monthly_actual_book_points_total
          ),
          monthly_actual_bbt_amount_total: getArrToString(
            rollup_data.monthly_actual_bbt_amount_total
          ),
          annual_actual_book_points_roll_up: getArrayValueSum(
            rollup_data.msf_actual_book_points_roll_up
          ),
          annual_actual_bbt_amount_roll_up: getArrayValueSum(
            rollup_data.msf_actual_bbt_amount_roll_up
          ),
          annual_actual_book_points_total: getArrayValueSum(
            rollup_data.msf_actual_book_points_total
          ),
          annual_actual_bbt_amount_total: getArrayValueSum(
            rollup_data.msf_actual_bbt_amount_total
          ),

          msf_actual_book_points_book_type_total: getArrOfArrToString(
            rollup_data.msf_actual_book_points_book_type_total
          ),
          monthly_actual_book_points_book_type_total: getArrOfArrToString(
            rollup_data.monthly_actual_book_points_book_type_total
          ),
          annual_actual_book_points_book_type_total: getArrOfBookTypeTotal(
            rollup_data.msf_actual_book_points_book_type_total
          ),
        };
        return rollup_data;
      } else {
        console.log("No recored found!");
        return false;
      }
    })
    .catch((err) => {
      console.log('error is', err);
      return false;
    });
  if (!goalRollUpData) {
    //console.log('False1');
    return false;
  }

  const goal_id = goalRollUpData.id;
  delete goalRollUpData.id;
  // Update roll-up for parent group
  const rollupResponse = await BusinessPlanSummary.update(goalRollUpData, {
    where: { id: goal_id },
  })
    .then((result) => {
      return true;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });

  if (!rollupResponse) {
    //console.log('False2');
    return false;
  }

  // Looking for the parent group of the current group
  const finalResponse = await Group.findOne({ where: { id: group_id } })
    .then((result) => {
      if (result.parent_group) {
        return roleUpActualTransaction(result.parent_group, goal_data, year);
      } else {
        return true;
      }
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
  return finalResponse;
};

router.get("/rollup-status", function (req, res) {
  BusinessPlanSummary.update(
    {
      msf_actual_book_points: null,
      msf_actual_bbt_amount: null,
      monthly_actual_book_points: null,
      monthly_actual_bbt_amount: null,
      msf_actual_book_points_roll_up: null,
      msf_actual_bbt_amount_roll_up: null,
      monthly_actual_book_points_roll_up: null,
      monthly_actual_bbt_amount_roll_up: null,
      msf_actual_book_points_total: null,
      msf_actual_bbt_amount_total: null,
      monthly_actual_book_points_total: null,
      monthly_actual_bbt_amount_total: null,
      // annual_book_points_goal_roll_up: null,
      // annual_bbt_amount_goal_roll_up: null,
      annual_actual_book_points_roll_up: null,
      annual_actual_bbt_amount_roll_up: null,
      annual_actual_book_points: null,
      annual_actual_bbt_amount: null,
      // annual_book_points_goal_total: null,
      // annual_bbt_amount_goal_total: null,
      annual_actual_book_points_total: null,
      annual_actual_bbt_amount_total: null,
      msf_actual_book_points_book_type_total: null,
      monthly_actual_book_points_book_type_total: null,
      annual_actual_book_points_book_type_total: null,
    },
    { where: {} }
  );
  Transaction.update(
    { "completed_summary_roll-ups": false },
    { where: { "completed_summary_roll-ups": true } }
  );
  res.send("Updated!");
});
router.get("/list-transactions", function (req, res) {
  Transaction.findAll().then((result) => res.send(result));
});
router.get("/summary-by-id", function (req, res) {
  BusinessPlanSummary.findOne({ where: req.query }).then((result) =>
    res.send(result)
  );
});

// Existing Group And People
router.get("/old-group", function (req, res) {
  Group_1.findAll({
    order: [["name", "ASC"]],
  })
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
});

transactionItemFormat = (item, dates) => {
  let book_type_points = {
    mbig: 0,
    big: 0,
    large: 0,
    medium: 0,
    small: 0,
    btg: 0,
    full: 0,
    magazines: 0,
  };
  let collection_between_dates = 0;
  item.map((itm) => {
    itm.transaction_line_items.map((line_item) => {
      const old_book_type_points = { ...book_type_points };
      const points = +line_item.quantity * +line_item.item.bbt_book_points;
      if (dates) {
        const item_date = new Date(itm.date);
        if (
          item_date.getTime() >= dates.start.getTime() &&
          item_date.getTime() <= dates.end.getTime()
        ) {
          collection_between_dates += points;
        }
      }
      switch (line_item.item.book_type) {
        case "Large":
          book_type_points.large = old_book_type_points.large + points;
          break;

        case "Medium":
          book_type_points.medium = old_book_type_points.medium + points;
          break;

        case "Small":
          book_type_points.small = old_book_type_points.small + points;
          break;

        case "M-Big":
          book_type_points.mbig = old_book_type_points.mbig + points;
          break;

        case "BTG":
          book_type_points.btg = old_book_type_points.btg + points;
          break;

        case "Big":
          book_type_points.big = old_book_type_points.big + points;
          break;

        case "Full":
        case "Set":
          book_type_points.full = old_book_type_points.full + points;
          break;
        case "Magazines":
          book_type_points.magazines = old_book_type_points.magazines + points;
          break;
      }
    });
  });
  if (dates) {
    return { book_type_points, collection_between_dates };
  }
  return book_type_points;
};

// Dashboard Stats
transactionItems = async (
  transaction_group_id,
  transaction_where,
  distributor_id
) => {
  delete transaction_where.transaction_group_id;
  transaction_where = {
    ...transaction_where,
    transaction_group_id: transaction_group_id,
  };
  const item = await Transaction.findAll({
    where: transaction_where,
    attributes: [],
    include: [
      {
        model: TransactionLineItem,
        attributes: ["id", "item_id", "quantity", "price", "net_amount"],
        include: [
          {
            model: Item,
            attributes: ["name", "book_type", "bbt_book_points"],
          },
        ],
      },
    ],
  })
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
    });

  return transactionItemFormat(item);
};
getBookTypeWisePoints = (book_points) => {
  let book_types = [
    "mbig",
    "big",
    "full",
    "large",
    "medium",
    "small",
    "btg",
    "magazines",
  ];
  let type_points = {};
  if(book_types != null){
    book_types.map((type, indx) => {
      type_points[type] =
        book_points && book_points[indx] ? book_points[indx] : 0;
    });
  }
  return type_points;
};
// Top ten book points groups
router.get("/top-ten-group", async function (req, res) {
  const {
    sort_by,
    continent,
    country,
    year,
    group_id,
    distributor_id,
    start,
    end,
  } = req.query;
  let _where = {
    group_type: "Temple",
    parent_group: {
      [Sq.Op.ne]: null,
    },
  };
  // if (group_id) {
  // 	_where = { ..._where, id: group_id };
  // }
  let _whereYear = {};
  if (year) {
    _whereYear = {
      where: {
        year,
        period_id: null,
        distributor_id:null
      },
    };
  }
  var pageRecordLimt;
  if (group_id == null || group_id == undefined) {
    pageRecordLimt = {
      offset: 0,
      limit: 10,
    };
  }

  if (continent) {
    _where = { ..._where, sankirtan_group_continent: continent };
  } else if (country) {
    _where = { ..._where, sankirtan_group_country: country };
  }
  const sort_match = {
    book_point: "actual_book_points_total",
    bbt_amount: "actual_bbt_amount_total",
  };
  let topTenRecords = await BusinessPlanSummary.findAll({
    ..._whereYear,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
      "actual_book_points_total",
      "actual_bbt_amount_total",
    ],
    include: [
      {
        model: Group,
        where: _where,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
        ],
      },
    ],
    order: [[sort_match[sort_by], "DESC"]],
    ...pageRecordLimt,
  });
  
  
  topTenRecords = JSON.parse(JSON.stringify(topTenRecords));
  const formattedResult = [];
  topTenRecords.map((record) => {
    formattedResult.push({
      title: record.group.name,
      address: [record.group.meeting_state, record.group.meeting_country].join(
        ", "
      ),
      picture: record.group.picture_url,
      group_id: record.group_id,
      book_point:
        record.actual_book_points_total !== null
          ? record.actual_book_points_total
          : 0,
      bbt_amount:
        record.actual_bbt_amount_total !== null
          ? record.actual_bbt_amount_total
          : "$0",
      ...getBookTypeWisePoints(
        record.actual_book_points_book_type_total
      ),
    });
  });
  return res.send(formattedResult);
});

getMonthlyContinent = async (year, period_id) => {
  const monthlyContinentSummary = await BusinessPlanSummary.findAll({
    where: {
      year: year.toString(),
      distributor_id:null,
      period_id: period_id,
      actual_book_points_book_type_total: {
        [Sq.Op.ne]: null,
      }, 
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "period_id",
      "actual_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "continent",
          "group_type"
        ],
        where: {
          parent_group: {
            [Sq.Op.ne]: null,
          },
        },
      },
    ],
    order: [[{ model: Group }, "continent", "ASC"]],
  });
  let groupByContinent = {};
  monthlyContinentSummary.map((summary) => {
    summary = JSON.parse(JSON.stringify(summary));
    // if (typeof groupByContinent[summary.group.continent] === "undefined") {
    //   groupByContinent[summary.group.continent] = {
    //     title: summary.group.continent,
    //     points: [],
    //   };
    // }
    if (typeof groupByContinent[summary.group.continent] === "undefined") {
        groupByContinent[summary.group.continent] = {
          continent_id: null,
          title: summary.group.continent,
          total_temple: [],
          points:[],
        };
    }
    if (summary.group.group_type == "Continent") {
      groupByContinent[summary.group.continent].continent_id=summary.group.id;
    }
    groupByContinent[summary.group.continent].total_temple.push(summary.group_id);
    // pointsByBookType =
    //   summary.actual_book_points_book_type_total !== null &&
    //   typeof summary.actual_book_points_book_type_total !== "undefined"
    //     ? summary.actual_book_points_book_type_total
    //     : [];
    //     console.log(pointsByBookType);
    // groupByContinent[summary.group.continent].points.push(pointsByBookType);
  });
  for (let continent in groupByContinent) {
    const continentData = await BusinessPlanSummary.findOne({
      where: {
        year: year.toString(),
        distributor_id:null,
        period_id: period_id ,
        group_id:groupByContinent[continent].continent_id,
        actual_book_points_book_type_total: {
            [Sq.Op.ne]: null,
        },
      },
      attributes: [
        "id",
        "year",
        "group_id",
        "period_id",
        "actual_book_points_book_type_total",
      ],
    });
    groupByContinent[continent].points.push(continentData.actual_book_points_book_type_total);
  }
  return groupByContinent;
};

// arrangeArrayIntoBookTypes = (pointsArr) => {
//   let pointsByBookType = [0, 0, 0, 0, 0, 0, 0, 0];
//   pointsArr.map((points) => {
//     // console.log('points are', points);
//     if (points && points.length) {
//         pointsByBookType = points.map((point, indx) => {
//         return parseint(point) + parseint(pointsByBookType[indx]);
//       });
//     }
//   });
//   let continent_data = { points: getArrayValueSum(pointsByBookType) };
//   NEWSLETTER_BOOK_TYPES.map((type, indx) => {
//     continent_data[type] = pointsByBookType[indx] ? pointsByBookType[indx] : 0;
//   });
//   return continent_data;
// };

arrangeArrayIntoBookTypes = (pointsArr) => {
 // console.log('pointsAttay', pointsArr);
  let pointsByBookType = [0, 0, 0, 0, 0, 0, 0, 0];
  pointsArr.map((points) => {
    if (points && points.length) {
        pointsByBookType = points.map((point, indx) => {
        return parseInt(point) + parseInt(pointsByBookType[indx]);
      });
    }
  });
  let continent_data = { points: getArrayValueSum(pointsByBookType) };
  NEWSLETTER_BOOK_TYPES.map((type, indx) => {
    continent_data[type] = pointsByBookType[indx] ? pointsByBookType[indx] : 0;
  });
  return continent_data;
};

getMonthPeriods = async (year) => {
  const monthly_period = await Period.findAll({ 
    where: {  year,type: 'Month','is_active': 1 },
    attributes: [
      "id",
      "year",
    ],
  });
  let periods=[];
   monthly_period.map((period_id) => {
    periods.push(period_id.id);
  });
  return periods;
}



getAllTeamTypeTransaction = async (year, period, param) => {
  let _where = {}
  if(param !== undefined) {
    if(period != null && period.length != 0 )
    {
    _where={
      year: {
        [Sq.Op.lte]: year.toString(),
      },
      period_id: { [Sq.Op.in]: period },
      distributor_id: null,
      actual_team_book_points_book_type_total: {
        [Sq.Op.ne]: null,
      }
  };
}
else {
  _where={
    year: {
      [Sq.Op.lte]: year.toString(),
    },
    distributor_id :  null,
    actual_team_book_points_book_type_total: {
      [Sq.Op.ne]: null,
    }
};
}
}
else {
  _where={
    year: year.toString(),
    period_id:period,
    distributor_id: null,
    actual_team_book_points_book_type_total: {
      [Sq.Op.ne]: null,
    }
  };
}
// console.log('data', _where);
// return false;
let allTeamSummary = [];
if(param !== undefined)
{
   allTeamSummary = await BusinessPlanSummary.findAll({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_team_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: ["id", "name", "group_type"],
        where: {
          parent_group: null,
        },
      },
    ],
    order: [[{ model: Group }, "name", "ASC"]],
  });
}
else {
  allTeamSummary = await BusinessPlanSummary.findOne({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_team_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: ["id", "name", "group_type"],
        where: {
          parent_group: null,
        },
      },
    ],
    order: [[{ model: Group }, "name", "ASC"]],
  });
}
  // console.log('allTeamSummary', allTeamSummary)
    let groupByTeam = {};
    if(allTeamSummary != null)
    {
      let team_points = [0, 0, 0, 0, 0, 0, 0, 0]
      let teamPointsArray = [];
      if(allTeamSummary.length != undefined)
      {
      for(team in allTeamSummary){
        teamPointsArray.push(allTeamSummary[team].actual_team_book_points_book_type_total)
      }
      }
      else 
      {
       team_points=allTeamSummary.actual_team_book_points_book_type_total;
      }  

   
  SANKIRTAN_GROUP_TYPE.map((key,value) => {
    if (typeof groupByTeam[value] === "undefined") {
      if(teamPointsArray.length !== 0)
      {
           let total_points= teamPointsArray.reduce(function(a,b) {
            let c = a[value];
            let d = b[value];
            if(value != 8)
            {
            if(a[value][value] != undefined){
              c = a[value]
            }
            else{
              c = a
            }
          }
          if(c == undefined){
            c = [0,0,0,0,0,0,0,0]
          }
          if(arraysEqual(c,d)){
            d = [0,0,0,0,0,0,0,0]
          }
          let res = getSumOfArrays(c,d)
          return res
          });
          
          if(total_points != undefined)
          {
            if(teamPointsArray.length != 1)
            {
              groupByTeam[value] = {
                title: key,
                points: total_points,
              };
            }
            else {
              groupByTeam[value] = {
                title: key,
                points: total_points[value]
              };
            }
        }
      }
      else 
      {
        groupByTeam[value] = {
          title: key,
          points: team_points[value],
        };
      }
    }
  });
}
// console.log('gerr', groupByTeam);
  return groupByTeam;
};
//Team Book Distribution



router.get("/newsletter-team-type-transactions", async function (req, res) {
  let thisYearData = []
  let query_param= req.query;
  let returnedData = await checkConditionsAndReturnData(req);
  // console.log('qqq', query_param, 'aa', returnedData)
  if(query_param.param != undefined){
    thisYearData = await getAllTeamTypeTransaction(returnedData.year, returnedData.allPeriodIds, "c");
  //  console.log('thisYearTeamData', thisYearData);
  }
  else {
    thisYearData = await getAllTeamTypeTransaction(returnedData.year, returnedData.period_id);
  }
  
  const thisYearTeamData= [];
  for (let key in thisYearData) {
    // console.log(thisYearData[key].points);
    // console.log('templesData', thisYearData[temple].points, 'type', typeof thisYearData[temple].points);
    thisYearTeamData.push({
      title: thisYearData[key].title,
      ...arrangeArrayIntoBookTypes([thisYearData[key].points]),
    });
  }
  let lastYearData=null;
  if(returnedData.period_id != null && returnedData.last_year_period == null ){
    lastYearData=null;
  }else{
    if(query_param.param !== undefined){
      lastYearData = await getAllTeamTypeTransaction(parseInt(returnedData.year) - 1, returnedData.allPreviousYearPeriodIds, "c");
     // console.log('thisYearTeamData', lastYearData);
    }
    else {
      lastYearData = await getAllTeamTypeTransaction(parseInt(returnedData.year) - 1, returnedData.last_year_period);
    }
    // lastYearData = await getAllTeamTypeTransaction(returnedData.year,returnedData.last_year_period);
  }

  const lastYearTeamData = [];
  for (let key in lastYearData) {
    lastYearTeamData.push({
      title: lastYearData[key].title,
      ...arrangeArrayIntoBookTypes([lastYearData[key].points]),
    });
  }
  
  
 
  let formattedResult = [];
  thisYearTeamData.map((data,dat) => {
    const lastYearPoints =
    lastYearTeamData.length > 0
        ? lastYearTeamData.filter(
            (last_data) => last_data.key === data.key
          )
        : [{ points: 0 }];
    delete data.key;
    formattedResult.push({
      ...data,
      change: 
      (lastYearPoints != undefined && lastYearPoints[dat] != undefined) ?  
        (lastYearPoints[dat].length !== 0 && lastYearPoints[dat].points !== 0
          ? (((data.points - lastYearPoints[dat].points) * 100) /
            lastYearPoints[dat].points).toFixed(2)
          : "-") :"-",
    });
   
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  return res.status(200).send(formattedResult);
});
router.get("/newsletter-monthly-continent", async function (req, res) {
  let query_param= req.query;
  const year=query_param.year;
  let period_id=null;
  let last_year_period=null;
  if(query_param.period_id !== undefined){
    period_id=query_param.period_id;
    let _where={id:period_id}
    const this_year_period_data=await getPeriodData(_where);
    let last_year=parseInt(year) - 1;
    _where= {year:last_year.toString(),type: this_year_period_data.type,number:this_year_period_data.number,is_active : 1};
    const last_year_period_data=await getPeriodData(_where); 
    if(last_year_period_data != null){
     last_year_period=last_year_period_data.id;
    } 
  }
  const thisYearData = await getMonthlyContinent(year, period_id);
  const thisYearContinentData = [];
  for (let continent in thisYearData) {
    thisYearContinentData.push({
      title: continent + " (" + thisYearData[continent].total_temple.length + ")",
      continent,
      ...arrangeArrayIntoBookTypes(thisYearData[continent].points),
    });
  }
  let lastYearData=null;
  if(period_id != null  && last_year_period == null ){
    lastYearData=null;
  }else{
    lastYearData = await getMonthlyContinent(
      parseInt(year) - 1,
      last_year_period
    );
  } 
  const lastYearContinentData = [];
  for (let continent in lastYearData) {
    lastYearContinentData.push({
      title: continent + " (" + lastYearData[continent].total_temple.length + ")",
      continent,
      ...arrangeArrayIntoBookTypes(lastYearData[continent].points),
    });
  }
  let formattedResult = [];
  thisYearContinentData.map((data) => {
    const lastYearPoints =
      lastYearContinentData.length > 0
        ? lastYearContinentData.filter(
            (last_data) => last_data.continent === data.continent
          )
        : [{ points: 0 }];
    delete data.continent;
    let change =  (lastYearPoints.length > 0) ? (lastYearPoints[0].points !== 0
      ? (((data.points - lastYearPoints[0].points) * 100) /
        lastYearPoints[0].points).toFixed(2)
      : "-") : "-";
    formattedResult.push({
      ...data,
      change:
        change,
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  return res.status(200).send(formattedResult);
});
getPointsByBookType = (points) => {
  let pointsByType = {};
  NEWSLETTER_BOOK_TYPES.map((type, indx) => {
    pointsByType[type] = points[indx] ? points[indx] : 0;
  });
  pointsByType["total"] = getArrayValueSum(points);
  return pointsByType;
};

getTransactionYear = async (id) => {
  const getTransactionData = await Transaction.findOne({
          where: { id: id },
          attributes: ["photos2"],
        })
        // console.log('daaaa', getTransactionData)
  return getTransactionData;
}
topTempleByContinent = async (year,period_id) => {
  const templeByContinent = await BusinessPlanSummary.findAll({
    where: {
      year: year.toString(),
      distributor_id:null,
      period_id:period_id,
      actual_book_points_book_type_total: {
        [Sq.Op.ne]: null,
      },
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "continent",
          "group_type",
        ],
        where: {
          parent_group: {
            [Sq.Op.ne]: null,
          },
          
        },
      },
    ],
    order: [[{ model: Group }, "continent", "ASC"]],
  });
  let dataByContinent = {};
  templeByContinent.map((templeData) => {
    if (typeof dataByContinent[templeData.group.continent] === "undefined") {
      dataByContinent[templeData.group.continent] = [];
    }
    if (templeData.group.group_type == "Temple") {
      dataByContinent[templeData.group.continent].push({
        id: templeData.group.id,
        name: templeData.group.name,
        country: templeData.group.meeting_country,
        address: [
          templeData.group.meeting_state,
          templeData.group.meeting_country,
        ].join(","),
        picture_url: templeData.group.picture_url,
        ...getPointsByBookType(
          templeData.actual_book_points_book_type_total
        ),
      });
    }
  });
  return dataByContinent;
};
 

router.get("/topten-temple-by-continent", async function (req, res) {
  let returnedData = await checkConditionsAndReturnData(req);
  let thisYearData = await topTempleByContinent(returnedData.year,returnedData.period_id);
  for (let continent in thisYearData) {
    thisYearData[continent] = thisYearData[continent].sort(
      (a, b) => b.total - a.total
    );
  }
  const lastYearData = await topTempleByContinent(parseInt(returnedData.year) - 1,returnedData.last_year_period);
  const formattedResult = {};
  for (let continent in thisYearData) {
    if (typeof formattedResult[continent] === "undefined") {
      formattedResult[continent] = [];
    }
    thisYearData[continent].map((temple) => {
      if (formattedResult[continent].length < 10) {
        // Set Limit here, Default it 10
        let change = "-";
        if (typeof lastYearData[continent] !== "undefined") {
          const lastYear = lastYearData[continent].filter(
            (last) => last.id === temple.id
          );
          const lastTotal =
            typeof lastYear[0] !== "undefined" ? lastYear[0].total : 0;
          if (lastTotal > 0) {
            change = (((temple.total - lastTotal) * 100) / lastTotal).toFixed(2);
          }
        }
        // console.log('temple', temple)
        formattedResult[continent].push({
          ...temple,
          change: change,
        });
      }
    });
  }
  const formattedData = [];
  for (let continent in formattedResult) {
    formattedData.push({
      continent,
      temples: formattedResult[continent],
    });
  }
  // console.log('formatted', formattedData)
  return res.status(200).send(formattedData);
});



// Books Points by Year

router.get("/newsletter-book-points-byyear", async function (req, res) {
  const booksByYears = await BusinessPlanSummary.findAll({
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_total",
    ],
    include: [
      {
        model: Group,
        attributes: ["id", "name", "group_type"],
        where: {
          parent_group: null,
        },
      },
    ],
    where: {
      period_id : null,
      distributor_id :null,
      actual_book_points_total: {
        [Sq.Op.ne]: null,
      },
    },
    order: [["year", "ASC"]],
  });
  const dataByYears = [];
  booksByYears.map((bookData) => {
    let pointsByBookType =
      bookData.actual_book_points_total !== null
        ? bookData.actual_book_points_total
        : [];
    dataByYears.push({
      title: bookData.year,
      points: pointsByBookType,
    });
  });
  return res.status(200).send(dataByYears);
});

getAllCountriesMonthly = async (year,period) => {
  const allCountriesSummary = await BusinessPlanSummary.findAll({
    where: {
      year: year.toString(),
      period_id:period,
      distributor_id:null,
      actual_book_points_book_type_total: {
        [Sq.Op.ne]: null,
      },
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "group_type",
        ],
        where: {
          group_type: { [Sq.Op.in]: ["Country", "Temple"] },
          parent_group: {
            [Sq.Op.ne]: null,
          },
        },
      },
    ],
    order: [[{ model: Group }, "meeting_country", "ASC"]],
  });
  let groupByCountry = {};
  allCountriesSummary.map((summary) => {
    summary = JSON.parse(JSON.stringify(summary));
    if (typeof groupByCountry[summary.group.meeting_country] === "undefined") {
      groupByCountry[summary.group.meeting_country] = {
        title: summary.group.meeting_country,
        points: [],
      };
    }
  pointsByBookType =
        summary.actual_book_points_book_type_total !== null &&
        typeof summary.actual_book_points_book_type_total !==
          "undefined"
          ? summary.actual_book_points_book_type_total
          : [];
    
    if (summary.group.group_type == "Temple") {
      groupByCountry[summary.group.meeting_country].points.push(
        pointsByBookType
      );
    }
  });
  return groupByCountry;
};

router.get("/newsletter-all-countries-monthly", async function (req, res) {
  let returnedData = await checkConditionsAndReturnData(req);
  const thisYearData = await getAllCountriesMonthly(returnedData.year,returnedData.period_id);
  // console.log(thisYearData);
  const thisYearCountryData = [];
  for (let country in thisYearData) {
    console.log('getAllCountriesMonthly',thisYearData[country].points);

    thisYearCountryData.push({
      title: country + " (" + thisYearData[country].points.length + ")",
      country,
      ...arrangeArrayIntoBookTypes(thisYearData[country].points),
    });
  }
  const lastYearData = await getAllCountriesMonthly(parseInt(returnedData.year) - 1, returnedData.last_year_period);
  const lastYearCountryData = [];
  for (let country in lastYearData) {
    lastYearCountryData.push({
      title: country + " (" + lastYearData[country].points.length + ")",
      country,
      ...arrangeArrayIntoBookTypes(lastYearData[country].points),
    });
  }
  let formattedResult = [];
  thisYearCountryData.map((data) => {
    const lastYearPoints =
      lastYearCountryData.length > 0
        ? lastYearCountryData.filter(
            (last_data) => last_data.country === data.country
          )
        : [{ points: 0 }];
    delete data.country;
    formattedResult.push({
      ...data,
      change:
       (lastYearPoints.length) ? 
        (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
//  console.log('formattedResult', formattedResult);
  return res.status(200).send(formattedResult);
});

// Get Top Ten Countries Cumulative
pointsByPeriod = (periods, msf_points, month_points) => {
  let allPoints = [0, 0, 0, 0, 0, 0, 0];
  periods.map((period) => {
    if (period.type === "MSF") {
      const points =
        typeof msf_points[period.number] !== "undefined"
          ? msf_points[period.number]
          : [];
      allPoints = points.map((point, indx) => {
        return point + allPoints[indx];
      });
    } else {
      const points =
        typeof month_points[period.number] !== "undefined"
          ? month_points[period.number]
          : [];
      allPoints = points.map((point, indx) => {
        return point + allPoints[indx];
      });
    }
  });
  return allPoints;
};

getTopTenCountriesCumulative = async (year, period_id) => {
  let periods = null;
  if(period_id.length !== 0)
  {
    periods = { [Sq.Op.in]: period_id }
  }
  const formattedData = [];
  const allCountriesSummary = await BusinessPlanSummary.findAll({
    where: {
      year: {
        [Sq.Op.lte]: year.toString(),
      },
      period_id: null,
      distributor_id:null,
      actual_book_points_book_type_total: {
        [Sq.Op.ne]: null,
      },
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "group_type",
        ],
        where: {
          group_type: { [Sq.Op.in]: ["Country", "Temple"] },
          parent_group: {
            [Sq.Op.ne]: null,
          },
         
        },
      },
    ],
    order: [[{ model: Group }, "meeting_country", "ASC"]],
  });
  let groupByCountry = {};
  allCountriesSummary.map((summary) => {
      summary = JSON.parse(JSON.stringify(summary));
      if (typeof groupByCountry[summary.group.meeting_country] === "undefined") {
        groupByCountry[summary.group.meeting_country] = {
          country_id: null,
          total_temple: [],
          meeting_country:[],
          points:[],
        };
      }
      if (summary.group.group_type == "Country") {
        groupByCountry[summary.group.meeting_country].country_id=summary.group.id;
      }
      //checking temple exists and then pushing - shekhar
      if(groupByCountry[summary.group.meeting_country].total_temple.indexOf(summary.group_id) == -1)
      {
        if(groupByCountry[summary.group.meeting_country].country_id !=summary.group.id)
        {
      groupByCountry[summary.group.meeting_country].total_temple.push(
        summary.group_id
      );
        }
      }
  });

  for(country in groupByCountry){
    const countryData = await BusinessPlanSummary.findAll({
      where: {
        distributor_id:null,
        period_id: periods,
        year: {
          [Sq.Op.lte]: year.toString(),
        },
        actual_book_points_book_type_total: {
          [Sq.Op.ne]: null,
        },
        group_id: groupByCountry[country].country_id,
      },
      attributes: [
        "id",
        "year",
        "group_id",
        "period_id",
        "actual_book_points_book_type_total",
        "actual_book_points_total",
      ],
    });
    // adding elements of array - shekhar
    let ar = []
    countryData.map((data) => {
    ar.push(data.actual_book_points_book_type_total)
    });

   if(ar.length !== 0)
    {
    let total_points= ar.reduce(function(a,b) {
    let res = getSumOfArrays(a,b)
    return res
    });
    groupByCountry[country].points = total_points;
  }
    // console.log('adata', groupByCountry[country].total_temple);
    formattedData.push({
        title: country + "(" + groupByCountry[country].total_temple.length + ")",
        country,
        ...arrangeArrayIntoBookTypes([groupByCountry[country].points]),
      });
  }
  // console.log('form', formattedData);
  return formattedData;
};

router.get("/newsletter-topten-countries-cumulative", async function (
  req,
  res
) {
  let returnedData = await checkConditionsAndReturnData(req);
  let thisYearData = await getTopTenCountriesCumulative(returnedData.year, returnedData.allPeriodIds);
  // console.log(thisYearData);
  thisYearData = thisYearData.sort((a, b) => b.points - a.points);
  let lastYearData=null;
  if(returnedData.period_id != null && returnedData.last_year_period == null ){
    lastYearData=null;
  }else{
   lastYearData = await getTopTenCountriesCumulative(
      parseInt(returnedData.year) - 1,
      returnedData.allPreviousYearPeriodIds
    );
  }
  
  // console.log(lastYearData);
  let formattedResult = [];
  thisYearData.map((data) => {
    if (formattedResult.length <= 10) {
      const lastYearPoints = lastYearData !== null ? lastYearData.filter(
        (last) => last.country === data.country
      ) : [{ points: 0 }];
      const lastPoints =
      typeof lastYearPoints[0] === "undefined" ? 0 : lastYearPoints[0].points;
      delete data.country;
      formattedResult.push({
        ...data,
        change:
          lastPoints > 0
            ? (((data.points - lastPoints) * 100) / lastPoints).toFixed(2)
            : "-",
      });
      // console.log('points', data.points, 'last', lastPoints);
    }
    
  });
  // check and remove object where total are 0 - shekhar
  formattedResult = checkAndRemoveZeroEnteries(formattedResult)
  return res.status(200).send(formattedResult);
});

router.get("/newsletter-topten-temples-size", async function (
  req,
  res
) {
  let devotees = [];
  let returnedData = await checkConditionsAndReturnData(req);
  let query_param= req.query;
  // console.log('entered in newsletter');
  let temples = await Group.findAll({
    where: {
      group_type: 'Temple',
      parent_group: {
        [Sq.Op.ne]: null,
      }
    },
    attributes: [
      "id",
      "name",
      "group_type",
      "parent_group",
    ],
  });
  for(let devotee in temples){
   // console.log('group id', temples[devotee].id)
    let distributor = await GroupMember.findAll({
      where: {
        group: temples[devotee].id,
      },
      attributes: [
        "group",
        "people"
      ],
    });
    devotees.push({name:temples[devotee].name, group_id : temples[devotee].id, devoteesCount : distributor.length})
  }
  let mahaSmallTemples = getTemplesBySize(devotees, 'mahaSmall');
  let smallTemples = getTemplesBySize(devotees, 'Small');
  let mediumTemples = getTemplesBySize(devotees, 'Medium');
  let largeTemples = getTemplesBySize(devotees, 'Large');
  mahaSmallTemples = getOnlyTempleIds(mahaSmallTemples);
  smallTemples = getOnlyTempleIds(smallTemples);
  mediumTemples = getOnlyTempleIds(mediumTemples);
  largeTemples = getOnlyTempleIds(largeTemples);
  mahaSmallTemples = await getAllDataOfSelectedTemples(query_param, returnedData, mahaSmallTemples)
  smallTemples = await getAllDataOfSelectedTemples(query_param, returnedData, smallTemples)
  mediumTemples = await getAllDataOfSelectedTemples(query_param, returnedData, mediumTemples)
  largeTemples = await getAllDataOfSelectedTemples(query_param, returnedData, largeTemples)
 
  return res.status(200).send([{category : 'LARGE', temples : largeTemples, devotees : '(41+ devotees)'},{category : 'MEDIUM', temples : mediumTemples, devotees : '(21-40 devotees)'}, {category : 'SMALL', temples : smallTemples, devotees : '(6-20 devotees)'}, {category : 'MAHA SMALL', temples : mahaSmallTemples, devotees : '(1-5 devotees)'}]);
  
  // return res.status(200).send(formattedResult);
});
//update Access Permissions by shekhar
//shekhar
router.patch("/access-permissions", async function (req, res) {
let role = req.body.role;
if(req.body.role == "SuperAdmin"){
  role = "Super Admin"
}
else if(req.body.role == "GroupLeaders"){
  role = "Group Leaders"
}
 // console.log('groups', req.body.groups)
for (const property in req.body.permissions) {
  let permission = {
    create : req.body.permissions[property].create,
    read : req.body.permissions[property].read,
    edit : req.body.permissions[property].update,
    delete : req.body.permissions[property].delete,
    data_access : getArrToString(req.body.groups)
  };

  AccessPermission.update(permission,{ where: { [Sq.Op.and]: {
        roles: role,
        screen: property
      },
    }, })
    .then((result) => {
      if (result) {
       // console.log('resss', result);
      // console.log(result);
        
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      console.log('errrr', err)
      res.status(503).send({ error: err.original });
    });
    
  }
  setTimeout(function () {
  AccessPermission.findAll({
    attributes: ["screen", "create", "read", "edit", "delete", "data_access"],
    where: {
      roles: role
    },
  })
  .then((array) => {
    res.status(200).send({permissions : commonPermissionsObject(array), message: "Permissions updated successfully!", role : req.body.role });
  })
  .catch((err) => {
   // console.log('eeeee', err)
  });
}, 500)
  
});

// shekhar
router.post("/role-access-permission", function (req, res) {
  // console.log('reachedddd', req.body.role)
  AccessPermission.findAll({
    attributes: ["screen", "create", "read", "edit", "delete", "data_access"],
    where: {
      roles: req.body.role
    },
  })
  .then((array) => {
    res.status(200).send({permissions : commonPermissionsObject(array)});
  })
  .catch((err) => {
    console.log('eeeee', err)
  });
  })

//get temples by Size; - added by shekhar
getTemplesBySize = (array, param) => {
  let res = [];
  if(param == 'mahaSmall')
  {
   res = array.filter(item => 
    item.devoteesCount > 0 && item.devoteesCount < 5);
  }
  else if (param == 'Small'){
    res = array.filter(item => 
      item.devoteesCount >= 6 && item.devoteesCount < 20);
  }
  else if (param == 'Medium'){
    res = array.filter(item => 
      item.devoteesCount >= 21 && item.devoteesCount < 40);
  }
  else {
    res = array.filter(item => 
    item.devoteesCount >= 41 );
  }
    return res
}

arraysEqual = (arr1, arr2) => {
  if(arr1.length !== arr2.length)
      return false;
  for(var i = arr1.length; i--;) {
      if(arr1[i] !== arr2[i])
          return false;
  }

  return true;
}

getOnlyTempleIds = (temples) => {
  let templeIds = [];
  for (temple in temples){
    templeIds.push(temples[temple].group_id)
  }
  return templeIds
}

checkAndRemoveZeroEnteries = (array) => {
  let notNullArray = []
  for(let a in array)
  {
    if(array[a].points !== 0)
    {
      notNullArray.push(array[a])
    }
  }
  return notNullArray
}

// Get all temples

getAllTemples = async (year, period,field, param, templeArray) => {
  let _where = {}
  if(param !== "d") {
    if(templeArray !== undefined){
    _where={
      year: {
        [Sq.Op.lte]: year.toString(),
      },
    period_id:period,
    distributor_id:null,
    group_id: { [Sq.Op.in]: templeArray }
  }
}
else {
  if(period.length !== 0 )
  {
    where={
      year: {
        [Sq.Op.lte]: year.toString(),
      },
    period_id: { [Sq.Op.in]: period },
    distributor_id:null
  }
  }
  else {
  _where={
    year: {
      [Sq.Op.lte]: year.toString(),
    },
    distributor_id:null
  }
}
}
}
else {
  if(templeArray !== undefined){
    _where={
    year: year.toString(),
    period_id:period,
    distributor_id:null,
    group_id: { [Sq.Op.in]: templeArray }
  }
}
  else 
  {
  _where={
    year: year.toString(),
    period_id:period,
    distributor_id:null
  };
}
}
 
  if(field == "actual_book_points_book_type_total"){
    _where = { ..._where, actual_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }else{
    _where = { ..._where, actual_arabic_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }
  const allTemplesSummary = await BusinessPlanSummary.findAll({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
      "actual_arabic_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "group_type",
        ],
        where: {
          group_type: "Temple",
          parent_group: {
            [Sq.Op.ne]: null,
          },
          
        },
      },
    ],
    order: [[{ model: Group }, "name", "ASC"]],
  });
  let groupByTemple = {};
  // console.log('allTemple', allTemplesSummary.length);
  allTemplesSummary.map((summary) => {
    summary = JSON.parse(JSON.stringify(summary));
    if (typeof groupByTemple[summary.group.name] === "undefined") {
      groupByTemple[summary.group.name] = {
        title: summary.group.name,
        country: summary.group.meeting_country,
        picture: summary.group.picture_url,
        points: [],
        arabic_points:[]
      };
    }
    pointsByBookType =
        summary.actual_book_points_book_type_total !== null &&
        typeof summary.actual_book_points_book_type_total !==
          "undefined"
          ? summary.actual_book_points_book_type_total
          : [];
    arabicpointsByBookType =
          summary.actual_arabic_book_points_book_type_total !== null &&
          typeof summary.actual_arabic_book_points_book_type_total !==
            "undefined"
            ? summary.actual_arabic_book_points_book_type_total
            : [];      
    groupByTemple[summary.group.name].points.push(pointsByBookType);
    groupByTemple[summary.group.name].arabic_points.push(arabicpointsByBookType);
  });
 return groupByTemple;
};

getAllTemples2 = async (year, period,field, param, templeArray) => {
 // console.log('year', period);
//  console.log('year', year, 'period', period);
  let _where = {}
  if(param !== "d") {
    // console.log('m here', period)
  _where={
    year: {
      [Sq.Op.lte]: year.toString(),
    },
    period_id: { [Sq.Op.in]: period },
  distributor_id:null
}
}
else {
  _where={
    year: year.toString(),
    period_id:period,
    distributor_id:null
  };
}
 
  if(field == "actual_book_points_book_type_total"){
    _where = { ..._where, actual_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }else{
    _where = { ..._where, actual_arabic_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }
  const allTemplesSummary = await BusinessPlanSummary.findAll({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
      "actual_arabic_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
          "group_type",
        ],
        where: {
          group_type: "Temple",
          parent_group: {
            [Sq.Op.ne]: null,
          },
          
        },
      },
    ],
    order: [[{ model: Group }, "name", "ASC"]],
  });
  let groupByTemple = {};
 // console.log('length', allTemplesSummary.length);
  allTemplesSummary.map((summary) => {
    summary = JSON.parse(JSON.stringify(summary));
    if (typeof groupByTemple[summary.group.name] === "undefined") {
      groupByTemple[summary.group.name] = {
        title: summary.group.name,
        country: summary.group.meeting_country,
        picture: summary.group.picture_url,
        points: [],
        arabic_points:[]
      };
    }
    pointsByBookType =
        summary.actual_book_points_book_type_total !== null &&
        typeof summary.actual_book_points_book_type_total !==
          "undefined"
          ? summary.actual_book_points_book_type_total
          : [];
    arabicpointsByBookType =
          summary.actual_arabic_book_points_book_type_total !== null &&
          typeof summary.actual_arabic_book_points_book_type_total !==
            "undefined"
            ? summary.actual_arabic_book_points_book_type_total
            : [];      
    groupByTemple[summary.group.name].points.push(pointsByBookType);
    groupByTemple[summary.group.name].arabic_points.push(arabicpointsByBookType);
  });
 return groupByTemple;
};

getAllDataOfSelectedTemples = async (query_param, returnedData, templeArray) => {
  let thisYearData = []
  if(query_param.param !== undefined){
    thisYearData = await getAllTemples(returnedData.year, returnedData.period_id,"actual_book_points_book_type_total", "c", templeArray);
  }
  else {
    thisYearData = await getAllTemples(returnedData.year, returnedData.period_id,"actual_book_points_book_type_total", "d", templeArray);
  }
  let lastYearData=null;
  if(returnedData.period_id != null && returnedData.last_year_period == null ){
    lastYearData=null;
  }else{
    if(query_param.param !== undefined){
      lastYearData = await getAllTemples(parseInt(returnedData.year) - 1, returnedData.last_year_period,"actual_book_points_book_type_total", "c", templeArray);
    }
    else {
      lastYearData = await getAllTemples(parseInt(returnedData.year) - 1, returnedData.last_year_period,"actual_book_points_book_type_total", "d", templeArray);
    }
  }
  const thisYearCountryData = [];
  for (let temple in thisYearData) {
    thisYearCountryData.push({
      title: thisYearData[temple].title,
      country: thisYearData[temple].country,
      picture: thisYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(thisYearData[temple].points),
    });
  }
  
  const lastYearCountryData = [];
  if(lastYearData !== null)
  {
  for (let temple in lastYearData) {
    lastYearCountryData.push({
      title: lastYearData[temple].title,
      country: lastYearData[temple].country,
      picture: lastYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(lastYearData[temple].points),
    });
  }
}
let formattedResult = [];
thisYearCountryData.map((data) => {
  const lastYearPoints =
    lastYearCountryData.length > 0
      ? lastYearCountryData.filter(
          (last_data) => last_data.temple === data.temple
        )
      : [{ points: 0 }];
  delete data.temple;
  formattedResult.push({
    ...data,
    change: 
    lastYearPoints.length > 0 ? 
      (lastYearPoints[0].points !== 0
        ? (((data.points - lastYearPoints[0].points) * 100) /
          lastYearPoints[0].points).toFixed(2)
        : "-") : "-",
  });
});
formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  return formattedResult;
}

router.get("/newsletter-all-temples", async function (req, res) {
  let query_param= req.query;
  let thisYearData = [];
  let returnedData = await checkConditionsAndReturnData(req);
  if(query_param.param !== undefined){
    thisYearData = await getAllTemples2(returnedData.year, returnedData.allPeriodIds,"actual_book_points_book_type_total", "c");
  }
  else {
    thisYearData = await getAllTemples(returnedData.year, returnedData.period_id,"actual_book_points_book_type_total", "d");
  }
  let lastYearData=null;
  if(returnedData.period_id != null && returnedData.last_year_period == null ){
    lastYearData=null;
  }else{
    if(query_param.param !== undefined){
      lastYearData = await getAllTemples2(parseInt(returnedData.year) - 1, returnedData.allPreviousYearPeriodIds,"actual_book_points_book_type_total", "c");
    }
    else {
      lastYearData = await getAllTemples(parseInt(returnedData.year) - 1, returnedData.last_year_period,"actual_book_points_book_type_total", "d");
    }
  }
  const thisYearCountryData = [];
  for (let temple in thisYearData) {
    thisYearCountryData.push({
      title: thisYearData[temple].title,
      country: thisYearData[temple].country,
      picture: thisYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(thisYearData[temple].points),
    });
  }
  
  const lastYearCountryData = [];
  if(lastYearData !== null)
  {
  for (let temple in lastYearData) {
    lastYearCountryData.push({
      title: lastYearData[temple].title,
      country: lastYearData[temple].country,
      picture: lastYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(lastYearData[temple].points),
    });
  }
}
  let formattedResult = [];
  thisYearCountryData.map((data) => {
    const lastYearPoints =
      lastYearCountryData.length > 0
        ? lastYearCountryData.filter(
            (last_data) => last_data.temple === data.temple
          )
        : [{ points: 0 }];
    delete data.temple;
    formattedResult.push({
      ...data,
      change: 
      lastYearPoints.length > 0 ? 
        (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);

  // if top ten cumulative returning first 10 results
   if(query_param.param !== undefined){
  formattedResult = formattedResult.slice(0, 10);
   }
  return res.status(200).send(formattedResult);
});
// Arabic book distribution
router.get("/newsletter-topten-temple-arabic", async function (req, res) {
  let returnedData = await checkConditionsAndReturnData(req);
  const thisYearData = await getAllTemples(returnedData.year, returnedData.period_id,"actual_arabic_book_points_book_type_total", "d");
  const thisYearCountryData = [];
  for (let temple in thisYearData) {
    // console.log('templesData', thisYearData[temple].points, 'type', typeof thisYearData[temple].points);
    thisYearCountryData.push({
      title: thisYearData[temple].title,
      country: thisYearData[temple].country,
      picture: thisYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(thisYearData[temple].arabic_points),
    });
  }
  let lastYearData=null;
  if(returnedData.period_id != null  && returnedData.last_year_period == null ){
    lastYearData=null;
  }else{
    lastYearData = await getAllTemples(parseInt(returnedData.year) - 1, returnedData.last_year_period,"actual_arabic_book_points_book_type_total", "d");
  }
  // console.log('data is this', thisYearData)
  const lastYearCountryData = [];
  for (let temple in lastYearData) {
    lastYearCountryData.push({
      title: thisYearData[temple].title,
      country: thisYearData[temple].country,
      picture: thisYearData[temple].picture,
      temple,
      ...arrangeArrayIntoBookTypes(lastYearData[temple].arabic_points),
    });
  }
  let formattedResult = [];
  thisYearCountryData.map((data) => {
    const lastYearPoints =
      lastYearCountryData.length > 0
        ? lastYearCountryData.filter(
            (last_data) => last_data.temple === data.temple
          )
        : [{ points: 0 }];
    delete data.temple;
    formattedResult.push({
      ...data,
      change: 
      lastYearPoints.length > 0 ? 
        (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  return res.status(200).send(formattedResult);
});

// get congregational preachings
getCongregationalPreaching = async (year, period_id) => {
  if (year < 1975) {
    return null;
  }
  const congregationalSummary = await BusinessPlanSummary.findAll({
    where: {
      year: year.toString(),
      period_id,
      distributor_id:null,
      actual_book_points_total: {
        [Sq.Op.ne]: null,
      },
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_book_type_total",
      "actual_book_points_total",
    ],
    include: [
      {
        model: Group,
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
        ],
        where: {
          parent_group: {
            [Sq.Op.ne]: null,
          },
          
        },
      },
    ],
    order: [["actual_book_points_total", "DESC"]],
  });
  const formattedResult = [];
  congregationalSummary.map((group) => {
    let group_data = {};
    let pointsByBookType =
      group.actual_book_points_book_type_total !== null
        ? group.actual_book_points_book_type_total
        : [];
    NEWSLETTER_BOOK_TYPES.map((type, indx) => {
      group_data[type] = pointsByBookType[indx] ? pointsByBookType[indx] : 0;
    });
    
    formattedResult.push({
      id: group.group.id,
      title: group.group.name,
      picture: group.group.picture_url,
      ...group_data,
      points: getArrayValueSum(pointsByBookType),
    });
  });
  return formattedResult;
};

router.get("/newsletter-congregational-preaching", async function (req, res) {
  let returnedData = await checkConditionsAndReturnData(req);
  const thisYear = await getCongregationalPreaching(returnedData.year, returnedData.period_id);
  let lastYear=null;
  if(returnedData.period_id != null  && returnedData.last_year_period == null ){
    lastYear=null;
  }else{
    lastYear = await getCongregationalPreaching(
      parseInt(returnedData.year) - 1,
      returnedData.last_year_period
    );
  }
  let formattedResult = [];
  thisYear.map((data) => {
    const lastYearPoints =
      lastYear !== null
        ? lastYear.filter((last_data) => last_data.id === data.id)
        : [{ points: 0 }];
    delete data.id;
    formattedResult.push({
      ...data,
      change: lastYearPoints.length > 0
      ? (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") 
      : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  return res.status(200).send(formattedResult);
});

newsletterTransactionItems = async (
  transaction_where,
  start_date,
  end_date
) => {
  const transactions = await Transaction.findAll({
    where: transaction_where,
    attributes: ["id", "date"],
    include: [
      {
        model: TransactionLineItem,
        attributes: ["id", "item_id", "quantity", "price", "net_amount"],
        include: [
          {
            model: Item,
            attributes: ["name", "book_type", "bbt_book_points"],
          },
        ],
      },
    ],
  })
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
    });

  var date = new Date();
  const start = start_date
    ? new Date(start_date)
    : new Date(date.getFullYear(), date.getMonth(), 1);
  const end = end_date
    ? new Date(end_date)
    : new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return transactionItemFormat(transactions, {
    start,
    end,
  });
};
router.get("/newsletter-book-types", async function (req, res) {
  let query_param= req.query;
  // console.log('query', query_param)
  const year=query_param.year;
  const period_id=query_param.period_id;
  let _where = {year,distributor_id:null};
  if(query_param.period_id === undefined){
    _where = { ..._where, period_id: null };
  }else{
    _where = { ..._where, period_id: query_param.period_id };
  }
  // if (query_param.group_id !== "undefined") {
  // 	_where = { ..._where, group_id: query_param.group_id };
  // }else{
  //   _where = { ..._where, group_id: '1'};
  // }
  let summaryBookTypeWise = await BusinessPlanSummary.findOne({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_bbt_amount_total",
      "actual_group_amount_total",
      "actual_book_points_total",
      "actual_book_points_book_type_total",
    ],
    include: [
      {
        model: Group,
        where: {
          parent_group: null,
        },
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
        ],
      },
    ],
  });

let summaryBookTypeWiseYearly = await BusinessPlanSummary.findAll({
    where: {
      period_id:null,
      distributor_id:null,
    },
    attributes: [
      "id",
      "year",
      "group_id",
      "actual_book_points_total",
    ],
    include: [
      {
        model: Group,
        where: {
          parent_group: null,
        },
        attributes: [
          "id",
          "name",
          "meeting_city",
          "meeting_state",
          "meeting_country",
          "picture_url",
        ],
      },
    ],
  });
  let lifetime_points=0;
  let yearly_points=0;
  summaryBookTypeWiseYearly.map((points) => {
    lifetime_points+= points.actual_book_points_total;
    if(points.year == year){
      yearly_points=points.actual_book_points_total;
    }
  });
  let formattedResult = {};
  if(summaryBookTypeWise !== null)
  {
  NEWSLETTER_BOOK_TYPES.map((type, indx) => {
    if (
      summaryBookTypeWise.actual_book_points_book_type_total &&
      summaryBookTypeWise.actual_book_points_book_type_total !== null
    ) {
      formattedResult[type] = summaryBookTypeWise
        .actual_book_points_book_type_total[indx]
        ? summaryBookTypeWise.actual_book_points_book_type_total[indx]
        : 0;
    } else {
      formattedResult[type] = 0;
    }
  });
}
  let period_number = new Date().getMonth(); // Default is current month
  let period_type = "Month";
  let period_start_month = period_number;
  let period_end_month = period_number;
  if (period_id) {
    const period = await Period.findOne({ where: { id: period_id, is_active : 1 } });
    period_number = period.number - 1;
    period_type = period.type;
    period_start_month = new Date(period.start).getMonth();
    period_end_month = new Date(period.end).getMonth();
  }
  let month_points = summaryBookTypeWise !== null ? summaryBookTypeWise.actual_book_points_total !== null
  ? summaryBookTypeWise.actual_book_points_total : 0
  : 0;
 
  const month_name =
    period_start_month === period_end_month
      ? MONTHS[period_start_month]
      : MONTHS[period_start_month] + " - " + MONTHS[period_end_month];
 
  formattedResult = {
    ...formattedResult,
    month: {
      name: month_name,
      points: month_points,
    },
    year: {
      name: year,
      points: yearly_points,
    },
    lifetime_points: 4999640 + lifetime_points,
  };
  return res.status(200).send(formattedResult);
});

getTopIndividuals = async (year,period,field, param,desciples) => {
  let _where = {}
  if(param !== undefined) {
    if(period.length !== 0)
    {
    _where={
      year: {
        [Sq.Op.lte]: year.toString(),
      },
      period_id: { [Sq.Op.in]: period },
      distributor_id: {
        [Sq.Op.ne]: null,
      },
  };
}
else {
  _where={
    year: {
      [Sq.Op.lte]: year.toString(),
    },
    distributor_id: {
      [Sq.Op.ne]: null,
    },
};
}
}
else {
  _where={
    year: year.toString(),
    period_id:period,
  };
  if(desciples !== undefined){
    _where={..._where,distributor_id: {
      [Sq.Op.in]: desciples,
    }
  }
  }else{
    _where={..._where,distributor_id: {
      [Sq.Op.ne]: null,
    },
    }
  }
}
  if(field == "actual_book_points_book_type_total"){
    _where = { ..._where, actual_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }else{
    _where = { ..._where, actual_arabic_book_points_book_type_total: {
      [Sq.Op.ne]: null,
      }};
  }
  const allDistributorSummary = await BusinessPlanSummary.findAll({
    where: _where,
    attributes: [
      "id",
      "year",
      "group_id",
      "distributor_id",
      "actual_book_points_book_type_total",
      "actual_arabic_book_points_book_type_total",
    ],
    include: [
      {
        model: People,
        as: 'distributorPeople',
        attributes: ["preferred_name","firstname", "middle_name","lastname"],
      }
    ],
  });
  let people_transaction = {};
  allDistributorSummary.map((summary) => {
  summary = JSON.parse(JSON.stringify(summary));
    if (typeof people_transaction[summary.distributor_id] === "undefined") {
      people_transaction[summary.distributor_id] = {
        name: [summary.distributorPeople.firstname, summary.distributorPeople.lastname].join(" "),
        points: [],
        arabic_points:[],
      };
    }
    pointsByBookType =
        summary.actual_book_points_book_type_total !== null &&
        typeof summary.actual_book_points_book_type_total !==
          "undefined"
          ? summary.actual_book_points_book_type_total
          : [];
    arabicpointsByBookType =
          summary.actual_arabic_book_points_book_type_total !== null &&
          typeof summary.actual_arabic_book_points_book_type_total !==
            "undefined"
            ? summary.actual_arabic_book_points_book_type_total
            : [];      
    
    people_transaction[summary.distributor_id].points.push(pointsByBookType);
    people_transaction[summary.distributor_id].arabic_points.push(arabicpointsByBookType);
  });
  return people_transaction;
};

getPeriodData = async (_where) => {
  const period_data = await Period.findOne({ where: _where });
  return period_data;
}

findAllPreviousPeriods = async (year, this_year_period_data) => {
  let periodIdsArray = [];
  let _where= {year:{
    [Sq.Op.lte]: year.toString(),
  },type: this_year_period_data.type,number:this_year_period_data.number,is_active : 1};
  const period_data = await Period.findAll({ where: _where, attributes: ["id"] });
  // console.log('period_data', period_data)
  if(period_data.length !== 0)
  {
    for(period in period_data)
    {
      periodIdsArray.push(period_data[period].id)
    }
  }
 // console.log('period_data', periodIdsArray)
  return periodIdsArray;
}
router.get("/newsletter-top-individuals", async function (req, res) {
  let query_param= req.query;
  let people_transaction = [];
  let returnedData = await checkConditionsAndReturnData(req);

  if(query_param.param !== undefined){
    people_transaction = await getTopIndividuals(returnedData.year,returnedData.allPeriodIds,'actual_book_points_book_type_total', 'c')
  }
  else {
    people_transaction = await getTopIndividuals(returnedData.year,returnedData.period_id,'actual_book_points_book_type_total')
  }

  const thisYearDistributorData = [];
  for (let distributor in people_transaction) {
    // console.log('templesData', thisYearData[temple].points, 'type', typeof thisYearData[temple].points);
    thisYearDistributorData.push({
      title: people_transaction[distributor].name,
      ...arrangeArrayIntoBookTypes(people_transaction[distributor].points),
    });
  }
  let last_year_people_transaction=null;
  if(returnedData.period_id != null  && returnedData.last_year_period == null ){
    last_year_people_transaction=null;
  }else{
    if(query_param.param !== undefined){
      last_year_people_transaction = await getTopIndividuals(
        parseInt(returnedData.year) - 1, returnedData.allPreviousYearPeriodIds,'actual_book_points_book_type_total', 'c');
    }
    else {
    last_year_people_transaction = await getTopIndividuals(
      parseInt(returnedData.year) - 1, returnedData.last_year_period,'actual_book_points_book_type_total');
    }
  }
  const lastYearDistributorData = [];
  for (let distributor in last_year_people_transaction) {
    lastYearDistributorData.push({
      title: last_year_people_transaction[distributor].name,
     ...arrangeArrayIntoBookTypes(last_year_people_transaction[distributor].points),
    });
  }
  let formattedResult = [];
  thisYearDistributorData.map((data) => {
    const lastYearPoints =
    lastYearDistributorData.length > 0
        ? lastYearDistributorData.filter(
            (last_data) => last_data.distributor === data.distributor
          )
        : [{ points: 0 }];
    delete data.distributor;
    formattedResult.push({
      ...data,
      change: 
      lastYearPoints.length > 0 ? 
        (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  const top_fifty_individual = formattedResult.slice(0, 50);
  return res.status(200).send(top_fifty_individual);
});
router.get("/newsletter-topten-prabhupada-desciples", async function (req, res) {
  let query_param= req.query;
  let people_transaction = [];
  let returnedData = await checkConditionsAndReturnData(req);
  let desciples = await Setting.findOne({ where: { key : 'harinama_initiation_spiritual_master_name'} });
  let formattedResult = [];
  if(desciples != ''){
    var desciples_array = desciples.value.split(',');
    let param=undefined;
    people_transaction = await getTopIndividuals(returnedData.year,returnedData.period_id,'actual_book_points_book_type_total',param,desciples_array)
    const thisYearDistributorData = [];
    for (let distributor in people_transaction) {
      // console.log('templesData', thisYearData[temple].points, 'type', typeof thisYearData[temple].points);
      thisYearDistributorData.push({
        title: people_transaction[distributor].name,
        ...arrangeArrayIntoBookTypes(people_transaction[distributor].points),
      });
    }
    let last_year_people_transaction=null;
    if(returnedData.period_id != null  && returnedData.last_year_period == null ){
      last_year_people_transaction=null;
    }else{
      last_year_people_transaction = await getTopIndividuals(
        parseInt(returnedData.year) - 1, returnedData.last_year_period,'actual_book_points_book_type_total',param,desciples_array);
    }
    const lastYearDistributorData = [];
    for (let distributor in last_year_people_transaction) {
      lastYearDistributorData.push({
        title: last_year_people_transaction[distributor].name,
      ...arrangeArrayIntoBookTypes(last_year_people_transaction[distributor].points),
      });
    }
    
    thisYearDistributorData.map((data) => {
      const lastYearPoints =
      lastYearDistributorData.length > 0
          ? lastYearDistributorData.filter(
              (last_data) => last_data.distributor === data.distributor
            )
          : [{ points: 0 }];
      delete data.distributor;
      formattedResult.push({
        ...data,
        change: 
        lastYearPoints.length > 0 ? 
          (lastYearPoints[0].points !== 0
            ? (((data.points - lastYearPoints[0].points) * 100) /
              lastYearPoints[0].points).toFixed(2)
            : "-") : "-",
      });
    });
  }
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  const top_fifty_individual = formattedResult.slice(0, 50);
  return res.status(200).send(top_fifty_individual);
});
router.get("/newsletter-top-individuals-arabic", async function (req, res) {
  let query_param= req.query;
  let returnedData = await checkConditionsAndReturnData(req);
  const people_transaction = await getTopIndividuals(returnedData.year,returnedData.period_id,'actual_arabic_book_points_book_type_total');
  const thisYearDistributorData = [];
  for (let distributor in people_transaction) {
    thisYearDistributorData.push({
      title: people_transaction[distributor].name,
      ...arrangeArrayIntoBookTypes(people_transaction[distributor].arabic_points),
    });
  }
  let last_year_people_transaction=null;
  if(returnedData.period_id != null  && returnedData.last_year_period == null ){
    last_year_people_transaction=null;
  }else{
    last_year_people_transaction = await getTopIndividuals(
      parseInt(returnedData.year) - 1, returnedData.last_year_period,'actual_arabic_book_points_book_type_total'
    );
  }
  const lastYearDistributorData = [];
  for (let distributor in last_year_people_transaction) {
    lastYearDistributorData.push({
      title: last_year_people_transaction[distributor].name,
     ...arrangeArrayIntoBookTypes(last_year_people_transaction[distributor].arabic_points),
    });
  }
  let formattedResult = [];
  thisYearDistributorData.map((data) => {
    const lastYearPoints =
    lastYearDistributorData.length > 0
        ? lastYearDistributorData.filter(
            (last_data) => last_data.distributor === data.distributor
          )
        : [{ points: 0 }];
    delete data.distributor;
    formattedResult.push({
      ...data,
      change: 
      lastYearPoints.length > 0 ? 
        (lastYearPoints[0].points !== 0
          ? (((data.points - lastYearPoints[0].points) * 100) /
            lastYearPoints[0].points).toFixed(2)
          : "-") : "-",
    });
  });
  formattedResult = formattedResult.sort((a, b) => b.points - a.points);
  // const top_fifty_individual = formattedResult.slice(0, 50);
  return res.status(200).send(formattedResult);
});
router.get("/search-period", function (req, res) {
  const { q, year = "2020" } = req.query;
  Period.findAll({
    attributes: ["id", "name", "year", "number", "start", "end", "type"],
    where: {
      year,
      name: { [Sq.Op.iLike]: `%${q}%` },
      is_active : 1
    },
  })
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});

router.get("/settings", function (req, res){
  Setting.findAll({
    attributes: ["key", "value", "id"]
  })
    .then((result) => {
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
  
})
router.patch("/update-settings", function (req, res){
   let people = req.body.people;
    let item = {
      role : 'Super Admin',
    };
    People.update(item, { where: { id: people[0].id } })
        .then((result) => {
          if (result) {
            res.status(200).send({message: "Settings updated successfully!"});
          } else {
            res.status(404).send({ success: 0 });
          }
        })
        .catch((err) => {
          res.status(503).send({ error: err.original });
        });
})

router.patch("/update-settings-data", async function (req, res){
  let setting = {
    key : req.body.key,
    value : req.body.value
  }
  let settings = []
  if(req.body.id == 30 || req.body.id == 42)
  {
    settings = await Setting.findOne({ where: { id : req.body.id } });
    var array = req.body.value.split(',');
    var settingsArray = settings.dataValues.value.split(',');
    filteredArray = settingsArray.filter( function( el ) {
    return array.indexOf( el ) < 0;
});

    for(let i in array){
      let item = {}
      if(req.body.id == 30)
      {
       item = {
        role : 'Super Admin',
      };
      }
      else {
        item = {
          harinama_initiation_spiritual_master_name : 'Bhaktivedānta Svāmī Prabhupāda',
        };
      }
      People.update(item, { where: { id: array[i] } })
          .then((result) => {
          })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
    }

    // Making other Members
    
    for(let i in filteredArray){
      let item = {}
      if(req.body.id == 30)
      {
      item = {
        role : 'Members',
      };
      }
      else {
        item = {
          harinama_initiation_spiritual_master_name : '',
        };
      }
      People.update(item, { where: { id: filteredArray[i] } })
          .then((result) => {
         })
          .catch((err) => {
            res.status(503).send({ error: err.original });
          });
    }
  }
  

  if(req.body.id == 35){
    const val = cryptr.encrypt(req.body.value);
    setting = {
      key : req.body.key,
      value : val
    }
  }


  Setting.update(setting, { where: { id: req.body.id } })
  .then((result) => {
    if (result) {
      res.status(200).send({message: "Settings updated successfully!"});
    } else {
      res.status(404).send({ success: 0 });
    }
  })
  .catch((err) => {
    res.status(503).send({ error: err.original });
  });
})

router.post("/add-settings-data", function (req, res){
//local
  // let setting = {
  //   id : req.body.id,
  //   key : req.body.key,
  //   value : req.body.value
  // }
 // live
  let setting = {
    key : req.body.key,
    value : req.body.value
  }
  Setting.create(setting)
    .then((result) => {
      if (result) {
        res.status(200).send({message: "Settings added successfully!"});
      } else {
        res.status(404).send({ success: 0 });
      }
    })
    .catch((err) => {
      res.status(503).send({ error: err.original });
    });
})

router.delete("/delete-settings-data/:id", function (req, res) {
  Setting.destroy({ where: { id: req.params.id } })
    .then((response) => {
      res.status(200).send({ message: "Settings deleted successfully!" });
    })
    .catch((err) => {
      res.send({ error: err.original });
    });
});


checkConditionsAndReturnData = async (req) => {
  let query_param= req.query;
  const year=query_param.year;
  let period_id=null;
  let last_year_period=null;
  let allPeriodIds = [];
  let allPreviousYearPeriodIds = [];
  if(query_param.period_id !== undefined){
    period_id=query_param.period_id;
    let _where={id:period_id}
    const this_year_period_data=await getPeriodData(_where);
     allPeriodIds = await findAllPreviousPeriods(year, this_year_period_data);
    let last_year=parseInt(year) - 1;
    _where= {year:last_year.toString(),type: this_year_period_data.type,number:this_year_period_data.number,is_active : 1};
    const last_year_period_data=await getPeriodData(_where); 
    if(last_year_period_data != null){
      allPreviousYearPeriodIds = await findAllPreviousPeriods(last_year, last_year_period_data);
      last_year_period=last_year_period_data.id;
    } 
  }
  return {
    period_id,
    year,
    last_year_period,
    allPeriodIds,
    allPreviousYearPeriodIds
  };
};

checkConditionsAndReturnData2 = async (req) => {
  let query_param= req.query;
  const year=query_param.year;
  let period_id=null;
  let last_year_period=null;
  let allPeriodIds = [];
  let allPreviousYearPeriodIds = [];
  if(query_param.period_id !== undefined){
    period_id=query_param.period_id;
    let _where={id:period_id}
    const this_year_period_data=await getPeriodData(_where);
     allPeriodIds = await findAllPreviousPeriods(year, this_year_period_data);
    let last_year=parseInt(year) - 1;
    _where= {year:last_year.toString(),type: this_year_period_data.type,number:this_year_period_data.number,is_active : 1};
    const last_year_period_data=await getPeriodData(_where); 
    if(last_year_period_data != null){
      allPreviousYearPeriodIds = await findAllPreviousPeriods(last_year, last_year_period_data);
      last_year_period=last_year_period_data.id;
    } 
  }
  return {
    period_id,
    year,
    last_year_period,
    allPeriodIds,
    allPreviousYearPeriodIds
  };
};

commonPermissionsObject = (array) => {
  var formarray = {}
  for (i in array){
formarray[array[i].screen] = {
"create" : array[i].create,
"read" :array[i].read,
"update" : array[i].edit,
"delete" :array[i].delete,
"data_access" : array[i].data_access
}
}
return formarray
}


const getHierarchy = async (total) => {
 // console.log('dhddd', total)
  let arr = []
  await Group.findAll({
 attributes: ["child_groups_hierarchy"],
 where: { id: { [Sq.Op.in]: total } }
})
 .then((result) => {
 // console.log('dhddd', result.length)
  for(let id in result) {
   // console.log('data', result[id].dataValues.child_groups_hierarchy)
    if(result[id].dataValues.child_groups_hierarchy !== null) {
     arr = arr.concat(result[id].dataValues.child_groups_hierarchy);
    }
  }
})
.catch((err) => {
 // console.log('eeeee', err)
});

return arr
}

const getData = async (userId, access) => {
      // console.log('acs is', getAccess(access))
      let groupArray = []
      await GroupMember.findAll({
          attributes: ["group", "position"],
          where: {
          [Sq.Op.and]: [
           { 
             people : userId
           },
           {
            [Sq.Op.or]: [
              {
                position : getAccess(access)
              }
            ]
           }
          ]
          },
        })
        .then((array) => {
          for(let a in array)
          {
          groupArray.push(array[a].dataValues.group)
          }
        })
        .catch((err) => {
          console.log('eeeee', err)
        });
       
        return groupArray
};

sortArrayAndReturnTenResults = (array) => {
  array = array.sort((a, b) => b.devoteesCount - a.devoteesCount);
  array = array.slice(0, 10);
  return array;
}

const getAccess = (access) => {
   let result = []
  if(access.length == 3) {
    result = ["Member", "Leader"] 
  }
  else {
    if(access == 1){
      result = ["Leader"] 
    }
    else {
      result = ["Member"] 
    }
  }

  return result
}
const getDashboardGrowth = async (_where) => {
  // console.log('m working', _where.year)
  let growth = [];
  if (parseInt(_where.year) >= 1965) {
    growth = await BusinessPlanSummary.findAll({
      where: _where,
      attributes: [
        [
          Sq.fn("sum", Sq.col("actual_book_points_total")),
          "total_annual_actual_book_points",
        ],
        [
          Sq.fn("sum", Sq.col("actual_bbt_amount_total")),
          "total_annual_actual_bbt_amount",
        ],
        [
          Sq.fn("sum", Sq.col("book_points_goal_total")),
          "total_annual_book_points_goal",
        ],
        [
          Sq.fn("sum", Sq.col("bbt_amount_goal_total")),
          "total_annual_bbt_amount_goal",
        ],
        [
          Sq.fn("sum", Sq.col("group_amount_goal_total")),
          "total_annual_group_amount_goal",
        ]
      ],
    });
    let laxmi_progress = moneyToNumber(growth[0].dataValues.total_annual_actual_bbt_amount) * 100 /
          moneyToNumber(growth[0].dataValues.total_annual_group_amount_goal)
    let book_progress = moneyToNumber(growth[0].dataValues.total_annual_actual_book_points) * 100 /
          moneyToNumber(growth[0].dataValues.total_annual_bbt_amount_goal);
          growth.laxmi_progress = laxmi_progress
          growth.book_progress = book_progress
     growth = [
      ...growth,
      laxmi_progress,
      book_progress
    ]
   
  } else {
   
    growth = [
      {
        total_actual_book_points: null,
        total_annual_actual_bbt_amount: null,
      },
    ];
  }

  return growth;
};

const  withoutDistributionGoals= async (
  {
    group_id,
    year,
    period_id,
    type,
    created_by_id,
    last_modified_by_id,
    organization_id,
    distributor_id
  },
  { goal_book_points, goal_amount_remitted_bbt, goal_amount_collected },
  existing_data = []
) => {
  let _where = {
    group_id,
    year,
    distributor_id
  };
 
  let goal = {};
  BusinessPlanSummary.findOne({ where: _where }).then(async (result) => {
    if (!result) {
      goal = {
        ...goal,
        year: year,
        group_id: group_id,
        period_id:period_id,
        distributor_id:distributor_id,
      };
      if (type === "MSF") {
        goal = {
          ...goal,
          msf_book_points_goal: goal_book_points,
          msf_bbt_amount_goal: goal_amount_remitted_bbt,
          msf_group_amount_goal: goal_amount_collected,
          msf_book_points_goal_total: goal_book_points,
          msf_bbt_amount_goal_total: goal_amount_remitted_bbt,
          msf_group_amount_goal_total: goal_amount_collected,
        };
  
      } else {
        goal = {
          ...goal,
          monthly_book_points_goal: goal_book_points,
          monthly_bbt_amount_goal: goal_amount_remitted_bbt,
          monthly_group_amount_goal: goal_amount_collected,
          monthly_book_points_goal_total: goal_book_points,
          monthly_bbt_amount_goal_total: goal_amount_remitted_bbt,
          monthly_group_amount_goal_total: goal_amount_collected,
        };
      }
    
      goal = {
        ...goal,
        annual_book_points_goal: goal_book_points,
        annual_bbt_amount_goal: goal_amount_remitted_bbt,
        annual_group_amount_goal: goal_amount_collected,
        annual_book_points_goal_total: goal_book_points,
        annual_bbt_amount_goal_total: goal_amount_remitted_bbt,
        annual_group_amount_goal_total: goal_amount_collected,
        created_by_id: created_by_id,
        last_modified_by_id: last_modified_by_id,
        organization_id: organization_id,
      };
      goal = {
        ...goal,
        last_modified_by_id: created_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.create(goal);
      // const getParent = await Group.findOne({ where: { id: group_id } });
      //   if (
      //     typeof getParent.parent_group !== "undefined" &&
      //     getParent.parent_group !== null
      //   ) {
      //     rollupGoals(
      //       {
      //         group_id: getParent.parent_group,
      //         year,
      //         period_id,
      //         type,
      //         created_by_id,
      //         last_modified_by_id,
      //         organization_id,
      //       },
      //       {
      //         goal_book_points,
      //         goal_amount_remitted_bbt,
      //         goal_amount_collected,
      //       },
      //     );
      //   }
    }else{
      if (type === "MSF") {
        goal = {
          ...goal,
          msf_book_points_goal: adjustExistingGoal(
            result.msf_book_points_goal,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
          msf_bbt_amount_goal: adjustExistingGoal(
            result.msf_bbt_amount_goal,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
          ),
          msf_group_amount_goal: adjustExistingGoal(
            result.msf_group_amount_goal,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
          msf_book_points_goal_total: 
          adjustExistingGoal(
            result.msf_book_points_goal_total,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
          msf_bbt_amount_goal_total: 
            adjustExistingGoal(
              result.msf_bbt_amount_goal_total,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
          
          msf_group_amount_goal_total: 
            adjustExistingGoal(
              result.msf_group_amount_goal_total,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),

        // end old summary
          annual_book_points_goal: adjustExistingGoal(
            result.annual_book_points_goal,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
          annual_bbt_amount_goal: adjustExistingGoal(
            result.annual_bbt_amount_goal,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
          ),
          annual_group_amount_goal: adjustExistingGoal(
            result.annual_group_amount_goal,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
          annual_book_points_goal_total: 
            adjustExistingGoal(
              result.annual_book_points_goal_total,
              goal_book_points,
              existing_data.old_book_point_goal,
           ),
          
          annual_bbt_amount_goal_total: 
            adjustExistingGoal(
              result.annual_bbt_amount_goal_total,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
          annual_group_amount_goal_total: 
            adjustExistingGoal(
              result.annual_group_amount_goal_total,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),
        };
      } else {
        goal = {
          ...goal,
          monthly_book_points_goal: goal_book_points,
          monthly_bbt_amount_goal: goal_amount_remitted_bbt,
          monthly_group_amount_goal: goal_amount_collected,
          monthly_book_points_goal_total: 
            adjustExistingGoal(
              result.monthly_book_points_goal_total,
              goal_book_points,
              existing_data.old_book_point_goal,
            ),
          
          monthly_bbt_amount_goal_total:
            adjustExistingGoal(
              result.monthly_bbt_amount_goal_total,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
          monthly_group_amount_goal_total: 
            adjustExistingGoal(
              result.monthly_group_amount_goal_total,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),
          annual_book_points_goal: goal_book_points,
          annual_bbt_amount_goal: goal_amount_remitted_bbt,
          annual_group_amount_goal: goal_amount_collected,
          annual_book_points_goal_roll_up: 
            adjustExistingGoal(
              result.monthly_book_points_goal_roll_up,
              goal_book_points,
              existing_data.old_book_point_goal,
            ),
          annual_bbt_amount_goal_roll_up: 
            adjustExistingGoal(
              result.monthly_bbt_amount_goal_roll_up,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
          annual_group_amount_goal_roll_up: 
            adjustExistingGoal(
              result.monthly_group_amount_goal_roll_up,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),
          annual_book_points_goal_total: 
            adjustExistingGoal(
              result.monthly_book_points_goal_total,
              goal_book_points,
              existing_data.old_book_point_goal,
            ),
          annual_bbt_amount_goal_total: 
            adjustExistingGoal(
              result.monthly_bbt_amount_goal_total,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
          
          annual_group_amount_goal_total: 
            adjustExistingGoal(
              result.monthly_group_amount_goal_total,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),
        };
      }

      goal = {
        ...goal,
        last_modified_by_id: created_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.update(goal, { where: { id: result.id } });
      // const getParent = await Group.findOne({ where: { id: group_id } });
      //   if (
      //     typeof getParent.parent_group !== "undefined" &&
      //     getParent.parent_group !== null
      //   ) {
      //     rollupGoals(
      //       {
      //         group_id: getParent.parent_group,
      //         year,
      //         period_id,
      //         type,
      //         created_by_id,
      //         last_modified_by_id,
      //         organization_id,
      //       },
      //       {
      //         goal_book_points,
      //         goal_amount_remitted_bbt,
      //         goal_amount_collected,
      //       },
      //       existing_data
      //     );
      //   }
    } 
  }); 
}
const  DistributionGoals= async (
  {
    group_id,
    year,
    period_id,
    created_by_id,
    last_modified_by_id,
    organization_id,
   },
  { goal_book_points, goal_amount_remitted_bbt, goal_amount_collected },
  existing_data = []
) => {
  let _where = {
    group_id,
    year,
    period_id,
    distributor_id:null,
  };
  let goal = {};
  BusinessPlanSummary.findOne({ where: _where }).then(async (result) => {
    if (!result) {
      goal = {
        ...goal,
        year: year,
        group_id: group_id,
        period_id:period_id,
        book_points_goal: goal_book_points,
        bbt_amount_goal: goal_amount_remitted_bbt,
        group_amount_goal: goal_amount_collected,
        book_points_goal_total: goal_book_points,
        bbt_amount_goal_total: goal_amount_remitted_bbt,
        group_amount_goal_total: goal_amount_collected,
        created_by_id: created_by_id,
        last_modified_by_id: last_modified_by_id,
        organization_id: organization_id,
      }
      await BusinessPlanSummary.create(goal);
    }else{
      goal = {
        ...goal,
        year: year,
        group_id: group_id,
        period_id:period_id,
        book_points_goal: adjustExistingGoal(
          result.book_points_goal,
          goal_book_points,
          existing_data.old_book_point_goal,
        ),
        bbt_amount_goal: adjustExistingGoal(
          result.bbt_amount_goal,
          goal_amount_remitted_bbt,
          existing_data.old_bbt_amount_goal,
        ),
        group_amount_goal: adjustExistingGoal(
          result.group_amount_goal,
          goal_amount_collected,
          existing_data.old_group_amount_goal,
        ),
        book_points_goal_total: 
          adjustExistingGoal(
            result.book_points_goal_total,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
        
        bbt_amount_goal_total: 
          adjustExistingGoal(
            result.bbt_amount_goal_total,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
          ),
        group_amount_goal_total: 
          adjustExistingGoal(
            result.group_amount_goal_total,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
          last_modified_by_id: created_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.update(goal, { where: { id: result.id } });
    }
  });
  updateYearly({
    group_id,
    year,
    created_by_id,
    last_modified_by_id,
    organization_id,
    type : "no_roll_up",
    distributor_id:0,
  },
  {
    goal_book_points,
    goal_amount_remitted_bbt,
    goal_amount_collected,
  },
  existing_data
  );
}
const  updateYearly= async (
  {
    group_id,
    year,
    created_by_id,
    last_modified_by_id,
    organization_id,
    type,
    distributor_id,
  },
  { goal_book_points, goal_amount_remitted_bbt, goal_amount_collected },
  existing_data = []
) => {
  let _where = {
    group_id,
    year,
  };
  let goal = {};
  if (
    typeof distributor_id !== "undefined" &&
    distributor_id > 0
  ) {
    _where = { ..._where, distributor_id: distributor_id };
    goal = {...goal,distributor_id: distributor_id,}
  }else{
    _where = { ..._where, distributor_id: null };
  }
  _where = { ..._where,period_id : null };
  BusinessPlanSummary.findOne({ where: _where }).then(async (result) => {
    if (!result) {
      goal = {
        ...goal,
        year: year,
        group_id: group_id,
      };
      if(type =='no_roll_up'){
        goal = {
          ...goal,
          book_points_goal: goal_book_points,
          bbt_amount_goal: goal_amount_remitted_bbt,
          group_amount_goal: goal_amount_collected,
        }
      }else{
        goal = {
          ...goal,
          book_points_goal_roll_up: goal_book_points,
          bbt_amount_goal_roll_up: goal_amount_remitted_bbt,
          group_amount_goal_roll_up: goal_amount_collected,
        }
      }
      goal = {
        ...goal,
        book_points_goal_total: goal_book_points,
        bbt_amount_goal_total: goal_amount_remitted_bbt,
        group_amount_goal_total: goal_amount_collected,
        created_by_id: created_by_id,
        last_modified_by_id: last_modified_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.create(goal);
    }else{
      if(type =='no_roll_up'){
        goal = {
          ...goal,
          book_points_goal: adjustExistingGoal(
            result.book_points_goal,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
          bbt_amount_goal: adjustExistingGoal(
            result.bbt_amount_goal,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
          ),
          group_amount_goal: adjustExistingGoal(
            result.group_amount_goal,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
        }
        
        }else{
          goal = {
            ...goal,
            book_points_goal_roll_up: adjustExistingGoal(
              result.book_points_goal_roll_up,
              goal_book_points,
              existing_data.old_book_point_goal,
            ),
            bbt_amount_goal_roll_up: adjustExistingGoal(
              result.bbt_amount_goal_roll_up,
              goal_amount_remitted_bbt,
              existing_data.old_bbt_amount_goal,
            ),
            group_amount_goal_roll_up: adjustExistingGoal(
              result.group_amount_goal_roll_up,
              goal_amount_collected,
              existing_data.old_group_amount_goal,
            ),
          }
      }
      goal = {
        ...goal,
        book_points_goal_total: 
          adjustExistingGoal(
            result.book_points_goal_total,
            goal_book_points,
            existing_data.old_book_point_goal,
          ),
        
        bbt_amount_goal_total: 
          adjustExistingGoal(
            result.bbt_amount_goal_total,
            goal_amount_remitted_bbt,
            existing_data.old_bbt_amount_goal,
          ),
        group_amount_goal_total: 
          adjustExistingGoal(
            result.group_amount_goal_total,
            goal_amount_collected,
            existing_data.old_group_amount_goal,
          ),
        last_modified_by_id: created_by_id,
        organization_id: organization_id,
      };
      await BusinessPlanSummary.update(goal, { where: { id: result.id } });
    } 
  }); 

}
const  updateTransactionsYearly= async (
  {
    group_id,
    year,
    distributor_id
  },
  {
    actual_book_points_yearly,
    actual_bbt_amount_yearly,
    book_type_points_yearly,
    arabic_book_points_yearly
  },
  {
    type,
  },
  {
    team_type,
  }
) => {
  let _where = {
    group_id,
    year,
    distributor_id,
    period_id : null
  };
  const summary_data = await BusinessPlanSummary.findOne({
    where: _where,
  })
  .then((result) => {
    if (result) {
      let rollup_data = {id: result.id};
      if(type == 'without_roll_up'){
        rollup_data = {
          ...rollup_data,
          actual_book_points: addNewTransactions(
            result["actual_book_points"],
            actual_book_points_yearly,
          ),
          actual_bbt_amount: addNewTransactions(
            result["actual_bbt_amount"],
            actual_bbt_amount_yearly,
          ),
        }
      }else{
        rollup_data = {
          ...rollup_data,
          actual_book_points_roll_up: addNewTransactions(
            result["actual_book_points_roll_up"],
            actual_book_points_yearly,
          ),
          actual_bbt_amount_roll_up: addNewTransactions(
            result["actual_bbt_amount_roll_up"],
            actual_bbt_amount_yearly,
          ),
        }
      }
      rollup_data = {
        ...rollup_data,
        actual_book_points_total: addNewTransactions(
          result["actual_book_points_total"],
          actual_book_points_yearly,
        ),
        actual_bbt_amount_total: addNewTransactions(
          result["actual_bbt_amount_total"],
          actual_bbt_amount_yearly,
        ),
        actual_book_points_book_type_total: getArrOfArrToStrings(
          result["actual_book_points_book_type_total"],
          book_type_points_yearly,
        ),
        actual_arabic_book_points_book_type_total: getArrOfArrToStrings(
          result["actual_arabic_book_points_book_type_total"],
          arabic_book_points_yearly,
        ),
        actual_team_book_points_book_type_total:getArrOfBookTypeTotalNew(
          result["actual_team_book_points_book_type_total"],
          book_type_points_yearly,
          team_type,
        )
      };
      return rollup_data;
    } else {
      return false;
    }
  })
  .catch((error) => {
    console.log(error);
    return false;
  }); 
  const summary_id = summary_data.id;
  delete summary_data.id;
  
  // Update roll-up for parent group
  const rollupResponse = await BusinessPlanSummary.update(summary_data, {
    where: { id: summary_id },
  })
  .then((result) => {
    return true;
  })
  .catch((err) => {
    console.log(err);
    return false;
  });
}
module.exports = router;
