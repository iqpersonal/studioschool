"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
class DashboardController {
    constructor() {
        this.dashboardService = new dashboardService_1.DashboardService();
    }
    getStudentDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const studentId = req.params.id;
                const data = yield this.dashboardService.getStudentData(studentId);
                res.status(200).json(data);
            }
            catch (error) {
                res.status(500).json({ message: 'Error retrieving student dashboard data', error });
            }
        });
    }
    getParentDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentId = req.params.id;
                const data = yield this.dashboardService.getParentData(parentId);
                res.status(200).json(data);
            }
            catch (error) {
                res.status(500).json({ message: 'Error retrieving parent dashboard data', error });
            }
        });
    }
    getInstructorDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const instructorId = req.params.id;
                const data = yield this.dashboardService.getInstructorData(instructorId);
                res.status(200).json(data);
            }
            catch (error) {
                res.status(500).json({ message: 'Error retrieving instructor dashboard data', error });
            }
        });
    }
}
exports.DashboardController = DashboardController;
