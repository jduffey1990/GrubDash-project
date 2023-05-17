const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");
const dishes = require("../data/dishes-data");

// TODO: Implement the /orders handlers needed to make the tests pass
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`,
  });
}

function validateDishesArray(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({ status: 400, message: "Order must include at least one dish" });
  }
  
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (!dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity)) {
      return next({ status: 400, message: `Dish ${i} must have a quantity that is an integer greater than 0` });
    }
  }
  
  next();
}

function validateStatus(req, res, next) {
  const { status } = req.body.data;
  const { orderId } = req.params;
  const { order } = res.locals;

  if (!status) {
    return next({ status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered" });
  }
  
  const validStatuses = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (!validStatuses.includes(status)) {
    return next({ status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered" });
  }

  if (order.status === "delivered") {
    return next({ status: 400, message: "A delivered order cannot be changed" });
  }
  
  if (status === "delivered" && order.status !== "out-for-delivery") {
    return next({ status: 400, message: `Order status must be 'out-for-delivery' before it can be marked as 'delivered'` });
  }
  
  next();
}



function read(req, res, next) {
    res.json({ data: res.locals.order });
  };

function list(req, res) {
    const { orderId } = req.params;
    res.json({ data: orders.filter(orderId ? order => order.id == orderId : () => true) });
  }

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes: dishes.map((dish) => ({ ...dish })), // Make a copy of each dish
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res, next) {
  const { orderId } = req.params;
  const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const { order } = res.locals;

  if (id && orderId !== id) {
    return res.status(400).json({ error: `Order id does not match route id. Order: ${id}, Route: ${orderId}` });
  }

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes.map((dish) => ({ ...dish }));

  res.json({ data: { id, ...order } });
}
   
  
function destroy(req, res, next) {
  const { orderId } = req.params;
  const { order } = res.locals;
  const index = orders.findIndex((order) => order.id === Number(orderId));

  if (order.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending.",
    });
  }

  const deletedOrders = orders.splice(index, 1);
  res.sendStatus(204);
}



module.exports = {
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    validateDishesArray,
    create,
  ],
    list,
    read: [orderExists, read],
    update: [
        orderExists,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("status"),
        bodyDataHas("dishes"),
        validateStatus,
        validateDishesArray,
        update
    ],
  destroy: [orderExists, destroy],

};