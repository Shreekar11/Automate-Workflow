import { Request, Response } from "express";
import { WorkflowSchema } from "../types";
import { DELETE, GET, POST, PUT } from "../decorators/router";
import { PrismaClient } from "@prisma/client";
import { HTTPStatus } from "../constants";
import { APIResponse } from "../interface/api";
import { WorkflowService } from "../services/workflow.service";
import { UserService } from "../services/user.service";
import {
  UserNotFoundError,
  WorkflowError,
  WorkflowNotFoundError,
} from "../modules/error";
import { AuthMiddleware } from "../middlewares";

export default class WorkflowController {
  private prisma: PrismaClient;
  private workflowService: WorkflowService;
  private userService: UserService;

  constructor() {
    this.prisma = new PrismaClient();
    this.workflowService = new WorkflowService();
    this.userService = new UserService();
  }

  @POST("/api/v1/workflow")
  public async createWorkFlowData(
    req: Request,
    res: Response<APIResponse>
  ): Promise<Response<APIResponse>> {
    await AuthMiddleware.verifyToken(req, res, () => {});

    try {
      const { body } = req;
      const user = req.user;

      const parsedData = WorkflowSchema.safeParse(body);
      if (!parsedData.success) {
        return res.status(HTTPStatus.BAD_REQUEST).json({
          status: false,
          message: "Invalid workflow data",
        });
      }

      let userData;
      try {
        userData = await this.userService.fetchUserByClerkId(user.id);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return res.status(HTTPStatus.NOT_FOUND).json({
            status: false,
            message: error.message,
          });
        }
        throw error;
      }

      // after creating the worflow with webhook trigger, create a webhook secret key for the workflow
      const workflow = await this.workflowService.createWorkflow(
        userData,
        parsedData
      );

      const webhookSecret = await this.prisma.webhookKey.findFirst({
        where: {
          triggerId: workflow.triggerId,
        },
      });

      return res.status(HTTPStatus.CREATED).json({
        status: true,
        message: "Workflow created successfully",
        data: {
          ...workflow,
          webhookSecret: webhookSecret?.secretKey,
        },
      });
    } catch (err: any) {
      console.error("Error creating workflow:", err);
      return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Failed to create workflow",
      });
    }
  }

  @GET("/api/v1/workflow")
  public async getWorkFlowData(
    req: Request,
    res: Response<APIResponse>
  ): Promise<Response<APIResponse>> {
    await AuthMiddleware.verifyToken(req, res, () => {});
    const user = req.user;

    try {
      let userData;
      try {
        userData = await this.userService.fetchUserByClerkId(user.id);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return res.status(HTTPStatus.NOT_FOUND).json({
            status: false,
            message: error.message,
          });
        }
        throw error;
      }

      try {
        const userWorkFlowData = await this.workflowService.fetchAllWorkflows(
          userData
        );
        
        return res.status(HTTPStatus.OK).json({
          status: true,
          message: "Workflows retrieved successfully",
          data: userWorkFlowData,
        });
      } catch (error) {
        if (error instanceof WorkflowNotFoundError) {
          return res.status(HTTPStatus.NOT_FOUND).json({
            status: false,
            message: error.message,
          });
        }
        throw error;
      }
    } catch (err: any) {
      console.error("Error fetching workflows:", err);
      return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Failed to fetch workflows",
      });
    }
  }

  @GET("/api/v1/workflow/:id")
  public async getWorkFlowDataById(
    req: Request,
    res: Response<APIResponse>
  ): Promise<Response<APIResponse>> {
    await AuthMiddleware.verifyToken(req, res, () => {});

    try {
      const user = req.user;
      const { id } = req.params;

      if (!id) {
        return res.status(HTTPStatus.BAD_REQUEST).json({
          status: false,
          message: "Workflow ID is required",
        });
      }

      let userData;
      try {
        userData = await this.userService.fetchUserByClerkId(user.id);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return res.status(HTTPStatus.NOT_FOUND).json({
            status: false,
            message: error.message,
          });
        }
        throw error;
      }

      try {
        const workflowData = await this.workflowService.fetchWorkFlowById(
          id,
          userData.id
        );

        if (!workflowData) {
          return res.status(HTTPStatus.NOT_FOUND).json({
            status: false,
            message: "Workflow not found",
          });
        }

        if (workflowData.workflow.userId !== userData.id) {
          return res.status(HTTPStatus.CONFLICT).json({
            status: false,
            message:
              "Access denied, You do not have permission to access this workflow",
          });
        }

        return res.status(HTTPStatus.OK).json({
          status: true,
          message: "Workflow retrieved successfully",
          data: workflowData,
        });
      } catch (error) {
        if (error instanceof WorkflowError) {
          return res.status(HTTPStatus.BAD_REQUEST).json({
            status: false,
            message: error.message,
          });
        }
        throw error;
      }
    } catch (err: any) {
      console.error("Error fetching workflow:", err);
      return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Failed to fetch workflow",
      });
    }
  }

  @PUT("/api/v1/workflow")
  public async updateWorkflow(req: Request, res: Response<APIResponse>) {
    await AuthMiddleware.verifyToken(req, res, () => {});

    try {
      const body = req.body;
      const parsedData = WorkflowSchema.safeParse(body);
      if (!parsedData.success) {
        return res.status(HTTPStatus.BAD_REQUEST).json({
          status: false,
          message: "Invalid workflow data",
        });
      }

      const updatedWorkflowData = await this.workflowService.updateWorkflow(
        parsedData
      );

      if (!updatedWorkflowData) {
        return res.status(HTTPStatus.NOT_FOUND).json({
          status: false,
          message: "Workflow not found",
        });
      }

      return res.status(HTTPStatus.OK).json({
        status: true,
        message: "Workflow updated successfully",
        data: updatedWorkflowData,
      });
    } catch (err: any) {
      console.error("Error updating workflow:", err);

      if (err.code === "P2025") {
        return res.status(HTTPStatus.NOT_FOUND).json({
          status: false,
          message: "Workflow not found",
        });
      }

      return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Error updating workflow",
      });
    }
  }

  @DELETE("/api/v1/workflow/:id")
  public async deleteWorkflow(req: Request, res: Response<APIResponse>) {
    await AuthMiddleware.verifyToken(req, res, () => {});

    try {
      const { id } = req.params;
      const existingWorkflow = await this.prisma.workflow.findUnique({
        where: { id },
      });

      if (!existingWorkflow) {
        return res.status(HTTPStatus.NOT_FOUND).json({
          status: false,
          message: "Workflow not found or already deleted",
        });
      }

      const deleteWorkflow = await this.workflowService.deleteWorkflow(id);

      return res.status(HTTPStatus.OK).json({
        status: true,
        message: "Workflow and associated data deleted successfully",
        data: deleteWorkflow,
      });
    } catch (err: any) {
      console.error("Error deleting workflow:", err);

      if (err.code === "P2025") {
        return res.status(HTTPStatus.NOT_FOUND).json({
          status: false,
          message: "Workflow not found or already deleted",
        });
      }

      return res.status(HTTPStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Error deleting workflow",
      });
    }
  }
}
